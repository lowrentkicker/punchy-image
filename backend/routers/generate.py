"""Image generation, cancellation, image serving, export, reference upload, cost estimate, and model recommendation endpoints."""

import asyncio
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from backend.config import MODELS, get_api_key
from backend.models.generation import (
    BatchGenerateResponse,
    CostEstimateRequest,
    CostEstimateResponse,
    ExportRequest,
    GenerateRequest,
    GenerateResponse,
    ModelRecommendation,
    ReferenceUploadResponse,
)
from backend.services.cost_estimator import estimate_cost, log_spend
from backend.services.history import add_history_entry
from backend.services.image_processor import (
    EXPORT_MIME_TYPES,
    generate_thumbnail,
    image_to_base64_url,
    prepare_for_export,
    save_generation_result,
    validate_and_process_upload,
)
from backend.services.model_recommender import recommend_model
from backend.services.openrouter import OpenRouterError, generate_image
from backend.services.prompt_builder import STYLE_DISPLAY_NAMES, STYLE_PRESETS, build_prompt
from backend.services.reference_store import (
    delete_reference as _delete_ref_from_store,
    resolve_reference_urls,
    store_reference,
)
from backend.utils.api_errors import openrouter_error_to_http, unexpected_error_to_http
from backend.utils.logging import log_error
from backend.utils.storage import (
    get_images_dir,
    get_project_dir,
    get_thumbnails_dir,
    list_projects,
)

router = APIRouter(tags=["generate"])

# Track active generations for cancellation, keyed by request_id
_active_generations: dict[str, asyncio.Event] = {}

_UUID_RE = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$")


def _validate_id(value: str) -> None:
    """Raise 404 if the value is not a valid UUID."""
    if not _UUID_RE.match(value):
        raise HTTPException(status_code=404, detail="Not found")


def _validate_project(project: str) -> None:
    """Raise 404 if the project doesn't exist."""
    if project not in list_projects():
        raise HTTPException(status_code=404, detail="Not found")


def _get_references_dir() -> Path:
    """Get the references directory, creating it if needed."""
    d = get_project_dir() / "references"
    d.mkdir(parents=True, exist_ok=True)
    return d


async def _generate_single(
    request: GenerateRequest,
    cancel_event: asyncio.Event,
    batch_id: str | None = None,
) -> GenerateResponse:
    """Execute a single generation request and save results to history."""
    has_character_refs = bool(request.character_reference_ids)
    has_style_ref = bool(request.style_reference_id)

    final_prompt = build_prompt(
        user_prompt=request.prompt,
        style_preset=request.style_preset,
        negative_prompt=request.negative_prompt,
        model_id=request.model_id,
        has_character_refs=has_character_refs,
        has_style_ref=has_style_ref,
        image_weight=request.image_weight,
    )

    # Resolve reference images via the reference store
    reference_image_url, additional_image_urls = resolve_reference_urls(
        reference_image_id=request.reference_image_id,
        style_reference_id=request.style_reference_id,
        character_reference_ids=request.character_reference_ids,
    )

    result = await generate_image(
        prompt=final_prompt,
        model_id=request.model_id,
        cancel_event=cancel_event,
        reference_image_url=reference_image_url,
        aspect_ratio=request.aspect_ratio,
        resolution=request.resolution,
        additional_image_urls=additional_image_urls if additional_image_urls else None,
    )

    # Save image and thumbnail
    image_id, image_filename, thumbnail_filename = save_generation_result(
        result["image_data"], get_images_dir(), get_thumbnails_dir(),
    )

    image_url = f"/api/images/default/{image_filename}"
    thumbnail_url = f"/api/images/default/thumbnails/{thumbnail_filename}"

    # Record in history
    add_history_entry(
        image_id=image_id,
        image_filename=image_filename,
        thumbnail_filename=thumbnail_filename,
        prompt=request.prompt,
        model_id=request.model_id,
        result=result,
        aspect_ratio=request.aspect_ratio,
        resolution=request.resolution,
        style_preset=request.style_preset,
        negative_prompt=request.negative_prompt,
        image_weight=request.image_weight,
        batch_id=batch_id,
    )

    # Log spend for cost tracking
    log_spend(request.model_id, request.resolution or "1K", 1)

    return GenerateResponse(
        image_id=image_id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        text_response=result.get("text_response"),
        model_id=request.model_id,
        prompt=request.prompt,
        timestamp=datetime.now(timezone.utc).isoformat(),
        usage=result.get("usage"),
        aspect_ratio=request.aspect_ratio,
        resolution=request.resolution,
        style_preset=request.style_preset,
        negative_prompt=request.negative_prompt,
        image_weight=request.image_weight,
        batch_id=batch_id,
    )


@router.post("/generate")
async def generate(request: GenerateRequest) -> GenerateResponse | BatchGenerateResponse:
    if not get_api_key():
        raise HTTPException(
            status_code=400,
            detail={
                "error_type": "auth",
                "message": "No API key configured. Go to Settings to add your OpenRouter API key.",
            },
        )

    if request.model_id not in MODELS:
        raise HTTPException(
            status_code=400,
            detail={
                "error_type": "server",
                "message": f"Unknown model: {request.model_id}",
            },
        )

    variations = max(1, min(4, request.variations))

    request_id = request.request_id or str(uuid.uuid4())
    cancel_event = asyncio.Event()
    _active_generations[request_id] = cancel_event

    try:
        if variations == 1:
            return await _generate_single(request, cancel_event)
        else:
            batch_id = request.batch_id or str(uuid.uuid4())
            completed: list[GenerateResponse] = []
            errors: list[str] = []
            stagger_delay = 5.0  # seconds between requests to avoid rate limits

            # Determine per-variation model IDs (multi-model support)
            if request.model_ids and len(request.model_ids) == variations:
                for mid in request.model_ids:
                    if mid not in MODELS:
                        raise HTTPException(
                            status_code=400,
                            detail={"error_type": "server", "message": f"Unknown model in model_ids: {mid}"},
                        )
                variation_model_ids = request.model_ids
            else:
                variation_model_ids = [request.model_id] * variations

            max_variation_attempts = 2  # Original attempt + 1 retry

            for i in range(variations):
                if i > 0:
                    await asyncio.sleep(stagger_delay)
                if cancel_event.is_set():
                    break

                for attempt in range(max_variation_attempts):
                    try:
                        var_request = request.model_copy(update={"model_id": variation_model_ids[i]})
                        result = await _generate_single(var_request, cancel_event, batch_id=batch_id)
                        completed.append(result)
                        break  # Success — exit retry loop
                    except OpenRouterError as e:
                        log_error(
                            f"Batch variation {i+1}/{variations} attempt {attempt+1} "
                            f"(model={variation_model_ids[i]}) failed: {e.error_type} - {e.message}"
                        )
                        if e.error_type == "rate_limit" and e.retry_after:
                            stagger_delay = max(stagger_delay, e.retry_after)
                        if attempt < max_variation_attempts - 1 and e.error_type in ("rate_limit", "server"):
                            retry_wait = e.retry_after or (stagger_delay * 2)
                            await asyncio.sleep(retry_wait)
                        else:
                            errors.append(f"Variation {i+1}: {e.message}")
                    except Exception as e:
                        log_error(f"Batch variation {i+1}/{variations} unexpected error: {e}", e)
                        errors.append(f"Variation {i+1}: unexpected error")
                        break  # Don't retry unexpected errors

            if not completed:
                raise OpenRouterError("server", "All variations failed. " + "; ".join(errors))

            return BatchGenerateResponse(
                batch_id=batch_id,
                results=completed,
                total_requested=variations,
                total_completed=len(completed),
                errors=errors,
            )

    except OpenRouterError as e:
        raise openrouter_error_to_http(e, "Generation failed")
    except HTTPException:
        raise
    except Exception as e:
        raise unexpected_error_to_http(e, "generation")
    finally:
        _active_generations.pop(request_id, None)


@router.post("/generate/cancel/{request_id}")
async def cancel_generation(request_id: str) -> dict:
    event = _active_generations.get(request_id)
    if event:
        event.set()
        return {"cancelled": True}
    return {"cancelled": False, "message": "Generation not found or already completed"}


@router.post("/reference/upload", response_model=ReferenceUploadResponse)
async def upload_reference(file: UploadFile) -> ReferenceUploadResponse:
    """Upload a reference image (content, style, or character reference)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    raw = await file.read()
    try:
        processed_bytes, was_resized = validate_and_process_upload(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    reference_id = str(uuid.uuid4())
    data_url = image_to_base64_url(processed_bytes)
    store_reference(reference_id, data_url)

    ref_thumb_dir = _get_references_dir() / "thumbnails"
    ref_thumb_dir.mkdir(parents=True, exist_ok=True)

    ref_path = _get_references_dir() / f"{reference_id}.jpg"
    ref_path.write_bytes(processed_bytes)
    thumb_path = ref_thumb_dir / f"{reference_id}_thumb.png"
    generate_thumbnail(ref_path, thumb_path)

    return ReferenceUploadResponse(
        reference_id=reference_id,
        was_resized=was_resized,
        thumbnail_url=f"/api/reference/{reference_id}/thumbnail",
    )


@router.get("/reference/{reference_id}/thumbnail")
async def serve_reference_thumbnail(reference_id: str) -> Response:
    _validate_id(reference_id)
    thumb_path = _get_references_dir() / "thumbnails" / f"{reference_id}_thumb.png"
    if not thumb_path.exists():
        raise HTTPException(status_code=404)
    return Response(content=thumb_path.read_bytes(), media_type="image/png")


@router.delete("/reference/{reference_id}")
async def delete_reference(reference_id: str) -> dict:
    _validate_id(reference_id)
    _delete_ref_from_store(reference_id)
    ref_path = _get_references_dir() / f"{reference_id}.jpg"
    thumb_path = _get_references_dir() / "thumbnails" / f"{reference_id}_thumb.png"
    ref_path.unlink(missing_ok=True)
    thumb_path.unlink(missing_ok=True)
    return {"deleted": True}


@router.post("/cost-estimate", response_model=CostEstimateResponse)
async def get_cost_estimate(request: CostEstimateRequest) -> CostEstimateResponse:
    result = estimate_cost(
        model_id=request.model_id,
        resolution=request.resolution,
        variations=request.variations,
    )
    return CostEstimateResponse(**result)


@router.get("/style-presets")
async def list_style_presets() -> list[dict]:
    return [
        {"id": key, "name": STYLE_DISPLAY_NAMES[key], "suffix": suffix}
        for key, suffix in STYLE_PRESETS.items()
    ]


@router.post("/model-recommendation", response_model=ModelRecommendation)
async def get_model_recommendation(
    style_preset: str | None = None,
    resolution: str | None = None,
    has_character_refs: bool = False,
) -> ModelRecommendation:
    return recommend_model(
        style_preset=style_preset,
        resolution=resolution,
        has_character_refs=has_character_refs,
    )


@router.get("/export/{image_id}")
async def export_image(
    image_id: str,
    fmt: str = Query(default="png", alias="format"),
    quality: int = Query(default=90, ge=1, le=100),
    dpi: int | None = Query(default=None, ge=72, le=600),
) -> Response:
    _validate_id(image_id)
    image_path = get_images_dir() / f"{image_id}.png"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    if fmt not in EXPORT_MIME_TYPES:
        fmt = "png"

    clean_bytes = prepare_for_export(image_path, fmt=fmt, quality=quality, dpi=dpi)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = fmt if fmt != "jpeg" else "jpg"
    filename = f"imagegen_{timestamp}.{ext}"

    return Response(
        content=clean_bytes,
        media_type=EXPORT_MIME_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/images/{project}/thumbnails/{filename}")
async def serve_thumbnail(project: str, filename: str) -> Response:
    _validate_project(project)
    thumbnail_path = get_project_dir(project) / "thumbnails" / filename
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404)
    return Response(content=thumbnail_path.read_bytes(), media_type="image/png")


@router.get("/images/{project}/{filename}")
async def serve_image(project: str, filename: str) -> FileResponse:
    _validate_project(project)
    image_path = get_project_dir(project) / "images" / filename
    if not image_path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(image_path, media_type="image/png")
