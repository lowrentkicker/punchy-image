"""Multi-turn conversational editing, mask editing, composition, and enhancement endpoints."""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from backend.config import MODELS, get_api_key, is_conversational
from backend.models.conversation import (
    BranchRequest,
    ComposeRequest,
    ConversationEditRequest,
    ConversationSession,
    ConversationSessionSummary,
    CreateSessionRequest,
    EnhanceRequest,
    MaskEditRequest,
    RevertRequest,
    SubjectLockRequest,
)
from backend.models.generation import GenerateResponse
from backend.services.conversation import (
    add_turn,
    branch_from_turn,
    build_conversation_messages,
    create_session,
    delete_session,
    estimate_token_usage,
    get_active_branch,
    list_sessions,
    load_session,
    revert_to_turn,
    set_subject_lock,
    switch_branch,
    undo_turn,
)
from backend.services.history import add_history_entry
from backend.services.image_processor import (
    image_to_base64_url,
    save_generation_result,
)
from backend.services.mask_processor import (
    build_mask_prompt,
    composite_mask_on_image,
    decode_mask,
    image_to_base64_data_url,
)
from backend.services.openrouter import OpenRouterError, generate_image
from backend.services.prompt_builder import build_image_weight_instruction, build_prompt
from backend.services.reference_store import get_reference
from backend.utils.api_errors import openrouter_error_to_http, unexpected_error_to_http
from backend.utils.storage import (
    get_images_dir,
    get_project_dir,
    get_thumbnails_dir,
    read_json,
)

router = APIRouter(tags=["conversation"])


def _require_api_key() -> None:
    if not get_api_key():
        raise HTTPException(
            status_code=400,
            detail={"error_type": "auth", "message": "No API key configured"},
        )


def _require_model(model_id: str) -> None:
    if model_id not in MODELS:
        raise HTTPException(
            status_code=400,
            detail={"error_type": "server", "message": f"Unknown model: {model_id}"},
        )


def _require_session(session_id: str) -> ConversationSession:
    session = load_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={"error_type": "server", "message": "Session not found"},
        )
    return session


def _build_image_urls(image_id: str) -> tuple[str, str]:
    """Return (image_url, thumbnail_url) for a given image_id."""
    return (
        f"/api/images/default/{image_id}.png",
        f"/api/images/default/thumbnails/{image_id}_thumb.png",
    )


# ── Conversation Session CRUD ───────────────────────────────────────────

@router.post("/conversation/sessions", response_model=ConversationSession)
async def create_conversation_session(request: CreateSessionRequest) -> ConversationSession:
    _require_api_key()
    _require_model(request.model_id)
    session = create_session(request.model_id)

    # Seed session with original generation context so the model knows what to edit
    if request.initial_prompt:
        add_turn(session, prompt=request.initial_prompt, role="user")
    if request.initial_image_id:
        image_url, thumbnail_url = _build_image_urls(request.initial_image_id)
        add_turn(
            session,
            prompt=None,
            image_id=request.initial_image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            role="assistant",
        )

    return session


@router.get("/conversation/sessions", response_model=list[ConversationSessionSummary])
async def list_conversation_sessions() -> list[ConversationSessionSummary]:
    return list_sessions()


@router.get("/conversation/sessions/{session_id}", response_model=ConversationSession)
async def get_conversation_session(session_id: str) -> ConversationSession:
    return _require_session(session_id)


@router.delete("/conversation/sessions/{session_id}")
async def delete_conversation_session(session_id: str) -> dict:
    if delete_session(session_id):
        return {"deleted": True}
    raise HTTPException(
        status_code=404,
        detail={"error_type": "server", "message": "Session not found"},
    )


# ── Conversational Editing ──────────────────────────────────────────────

@router.post("/conversation/edit", response_model=GenerateResponse)
async def conversation_edit(request: ConversationEditRequest) -> GenerateResponse:
    """Send a conversational editing turn within a session."""
    _require_api_key()

    session = _require_session(request.session_id)
    model_id = request.model_id or session.model_id
    _require_model(model_id)

    # Build prompt with modifiers
    final_prompt = build_prompt(
        user_prompt=request.prompt,
        style_preset=request.style_preset,
        negative_prompt=request.negative_prompt,
        model_id=model_id,
        image_weight=request.image_weight,
    )

    # For conversational models, include conversation history
    conversation_history = None
    reference_image_url = None

    if is_conversational(model_id):
        conversation_history = build_conversation_messages(session)
    else:
        # Image-only model: use the most recent image as reference
        branch = get_active_branch(session)
        if branch and branch.turns:
            last_image_id = None
            for t in reversed(branch.turns):
                if t.image_id:
                    last_image_id = t.image_id
                    break
            if last_image_id:
                image_path = get_images_dir() / f"{last_image_id}.png"
                if image_path.exists():
                    reference_image_url = image_to_base64_url(image_path.read_bytes())

    # Subject lock: override reference with locked image
    if session.subject_locked and session.subject_lock_image_id:
        lock_path = get_images_dir() / f"{session.subject_lock_image_id}.png"
        if lock_path.exists():
            reference_image_url = image_to_base64_url(lock_path.read_bytes())

    cancel_event = asyncio.Event()

    try:
        # Add user turn first
        add_turn(session, prompt=request.prompt, role="user")

        result = await generate_image(
            prompt=final_prompt,
            model_id=model_id,
            cancel_event=cancel_event,
            reference_image_url=reference_image_url,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            conversation_history=conversation_history,
        )

        # Save image and thumbnail
        image_id, image_filename, thumbnail_filename = save_generation_result(
            result["image_data"], get_images_dir(), get_thumbnails_dir(),
        )
        image_url, thumbnail_url = _build_image_urls(image_id)
        timestamp = datetime.now(timezone.utc).isoformat()

        # Add assistant turn with generated image
        add_turn(
            session,
            prompt=None,
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            text_response=result.get("text_response"),
            usage=result.get("usage"),
            role="assistant",
        )

        # Also add to global history
        add_history_entry(
            image_id=image_id,
            image_filename=image_filename,
            thumbnail_filename=thumbnail_filename,
            prompt=request.prompt,
            model_id=model_id,
            result=result,
            session_id=request.session_id,
        )

        return GenerateResponse(
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            text_response=result.get("text_response"),
            model_id=model_id,
            prompt=request.prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
        )

    except OpenRouterError as e:
        # Remove the user turn we added since generation failed
        undo_turn(session)
        raise openrouter_error_to_http(e, "Conversation edit failed")
    except HTTPException:
        raise
    except Exception as e:
        undo_turn(session)
        raise unexpected_error_to_http(e, "conversation")


# ── Session Controls ────────────────────────────────────────────────────

@router.post("/conversation/undo/{session_id}")
async def undo_last_turn(session_id: str) -> dict:
    session = _require_session(session_id)
    if undo_turn(session):
        return {"undone": True}
    return {"undone": False, "message": "No turns to undo"}


@router.post("/conversation/revert")
async def revert_session(request: RevertRequest) -> dict:
    session = _require_session(request.session_id)
    if revert_to_turn(session, request.turn_index):
        return {"reverted": True, "turn_index": request.turn_index}
    return {"reverted": False, "message": "Invalid turn index"}


@router.post("/conversation/branch")
async def create_branch(request: BranchRequest) -> dict:
    session = _require_session(request.session_id)
    try:
        new_branch = branch_from_turn(session, request.turn_index)
        return {"branch_id": new_branch.branch_id, "name": new_branch.name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/conversation/switch-branch/{session_id}/{branch_id}")
async def switch_session_branch(session_id: str, branch_id: str) -> dict:
    session = _require_session(session_id)
    if switch_branch(session, branch_id):
        return {"switched": True, "branch_id": branch_id}
    return {"switched": False, "message": "Branch not found"}


@router.post("/conversation/subject-lock")
async def toggle_subject_lock(request: SubjectLockRequest) -> dict:
    session = _require_session(request.session_id)
    set_subject_lock(session, request.locked, request.image_id)
    return {"locked": request.locked}


@router.get("/conversation/token-usage/{session_id}")
async def get_token_usage(session_id: str) -> dict:
    session = _require_session(session_id)
    return estimate_token_usage(session)


# ── Mask Editing ────────────────────────────────────────────────────────

@router.post("/mask-edit", response_model=GenerateResponse)
async def mask_edit(request: MaskEditRequest) -> GenerateResponse:
    """Edit a masked region of an image."""
    _require_api_key()
    _require_model(request.model_id)

    source_path = get_images_dir() / f"{request.image_id}.png"
    if not source_path.exists():
        raise HTTPException(
            status_code=404,
            detail={"error_type": "server", "message": "Source image not found"},
        )

    # Decode mask
    mask_image = decode_mask(request.mask.mask_image_base64)

    # Build the mask-aware prompt
    mask_prompt = build_mask_prompt(
        prompt=request.prompt,
        mask=mask_image,
        model_id=request.model_id,
        mask_description=request.mask.description,
    )

    # Prepare reference image
    if is_conversational(request.model_id):
        # Send original image as reference; prompt describes what to edit
        reference_image_url = image_to_base64_url(source_path.read_bytes())
    else:
        # Composite mask onto image for image-only models
        composited_bytes = composite_mask_on_image(str(source_path), mask_image)
        reference_image_url = image_to_base64_data_url(composited_bytes)

    # Include conversation history if within a session
    conversation_history = None
    if request.session_id:
        session = load_session(request.session_id)
        if session and is_conversational(request.model_id):
            conversation_history = build_conversation_messages(session)

    cancel_event = asyncio.Event()

    try:
        result = await generate_image(
            prompt=mask_prompt,
            model_id=request.model_id,
            cancel_event=cancel_event,
            reference_image_url=reference_image_url,
            conversation_history=conversation_history,
        )

        image_id, image_filename, thumbnail_filename = save_generation_result(
            result["image_data"], get_images_dir(), get_thumbnails_dir(),
        )
        image_url, thumbnail_url = _build_image_urls(image_id)
        timestamp = datetime.now(timezone.utc).isoformat()

        add_history_entry(
            image_id=image_id,
            image_filename=image_filename,
            thumbnail_filename=thumbnail_filename,
            prompt=request.prompt,
            model_id=request.model_id,
            result=result,
            source_image_id=request.image_id,
            edit_type="mask",
        )

        # If in a conversation session, add the turn
        if request.session_id:
            session = load_session(request.session_id)
            if session:
                add_turn(session, prompt=f"[Mask edit] {request.prompt}", role="user")
                add_turn(
                    session, prompt=None, image_id=image_id,
                    image_url=image_url, thumbnail_url=thumbnail_url,
                    text_response=result.get("text_response"),
                    usage=result.get("usage"), role="assistant",
                )

        return GenerateResponse(
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            text_response=result.get("text_response"),
            model_id=request.model_id,
            prompt=request.prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
        )

    except OpenRouterError as e:
        raise openrouter_error_to_http(e, "Mask edit failed")
    except HTTPException:
        raise
    except Exception as e:
        raise unexpected_error_to_http(e, "mask edit")


# ── Multi-Image Composition ────────────────────────────────────────────

@router.post("/compose", response_model=GenerateResponse)
async def compose_images(request: ComposeRequest) -> GenerateResponse:
    """Combine multiple source images into a single output."""
    _require_api_key()
    _require_model(request.model_id)

    if len(request.source_images) < 2 or len(request.source_images) > 5:
        raise HTTPException(
            status_code=400,
            detail={"error_type": "server", "message": "Provide 2-5 source images"},
        )

    # Build composition prompt with labels
    label_parts = []
    image_urls: list[str] = []
    for src in request.source_images:
        ref_id = src.get("reference_id")
        label = src.get("label", "")
        if ref_id:
            url = get_reference(ref_id)
            if url:
                image_urls.append(url)
                if label:
                    label_parts.append(f"Image labeled '{label}'")

    if not image_urls:
        raise HTTPException(
            status_code=400,
            detail={"error_type": "server", "message": "No valid source images found"},
        )

    compose_instruction = "Compose the provided images into a single cohesive image."
    if label_parts:
        compose_instruction += f" Source images: {', '.join(label_parts)}."

    final_prompt = f"{compose_instruction} {request.prompt}"

    if request.image_weight is not None:
        weight_instruction = build_image_weight_instruction(request.image_weight, request.model_id)
        final_prompt += f". {weight_instruction}"

    cancel_event = asyncio.Event()

    try:
        result = await generate_image(
            prompt=final_prompt,
            model_id=request.model_id,
            cancel_event=cancel_event,
            additional_image_urls=image_urls,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
        )

        image_id, image_filename, thumbnail_filename = save_generation_result(
            result["image_data"], get_images_dir(), get_thumbnails_dir(),
        )
        timestamp = datetime.now(timezone.utc).isoformat()

        add_history_entry(
            image_id=image_id,
            image_filename=image_filename,
            thumbnail_filename=thumbnail_filename,
            prompt=request.prompt,
            model_id=request.model_id,
            result=result,
            edit_type="compose",
            source_count=len(request.source_images),
        )

        image_url, thumbnail_url = _build_image_urls(image_id)
        return GenerateResponse(
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            text_response=result.get("text_response"),
            model_id=request.model_id,
            prompt=request.prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
        )

    except OpenRouterError as e:
        raise openrouter_error_to_http(e, "Composition failed")
    except HTTPException:
        raise
    except Exception as e:
        raise unexpected_error_to_http(e, "composition")


# ── Super Resolution / Enhancement ─────────────────────────────────────

@router.post("/enhance", response_model=GenerateResponse)
async def enhance_image(request: EnhanceRequest) -> GenerateResponse:
    """Re-generate an image at higher resolution."""
    _require_api_key()

    source_path = get_images_dir() / f"{request.image_id}.png"
    if not source_path.exists():
        raise HTTPException(
            status_code=404,
            detail={"error_type": "server", "message": "Source image not found"},
        )

    # Default to Gemini 3 Pro for best 4K support
    model_id = request.model_id or "google/gemini-3-pro-image-preview"
    _require_model(model_id)

    # Get original prompt from history
    history_path = get_project_dir() / "history.json"
    history = read_json(history_path)
    original_prompt = ""
    if isinstance(history, list):
        for entry in history:
            if isinstance(entry, dict) and entry.get("image_id") == request.image_id:
                original_prompt = entry.get("prompt", "")
                break

    enhance_prompt = (
        f"Enhance this image to {request.target_resolution} resolution. "
        f"Preserve all content, composition, colors, and details exactly as they are. "
        f"Increase sharpness, clarity, and fine detail throughout the image."
    )
    if original_prompt:
        enhance_prompt += f" Original subject: {original_prompt}"

    reference_image_url = image_to_base64_url(source_path.read_bytes())

    cancel_event = asyncio.Event()

    try:
        result = await generate_image(
            prompt=enhance_prompt,
            model_id=model_id,
            cancel_event=cancel_event,
            reference_image_url=reference_image_url,
            resolution=request.target_resolution,
        )

        image_id, image_filename, thumbnail_filename = save_generation_result(
            result["image_data"], get_images_dir(), get_thumbnails_dir(),
        )
        timestamp = datetime.now(timezone.utc).isoformat()

        add_history_entry(
            image_id=image_id,
            image_filename=image_filename,
            thumbnail_filename=thumbnail_filename,
            prompt=original_prompt,
            model_id=model_id,
            result=result,
            resolution=request.target_resolution,
            source_image_id=request.image_id,
            edit_type="enhance",
        )

        image_url, thumbnail_url = _build_image_urls(image_id)
        return GenerateResponse(
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            text_response=result.get("text_response"),
            model_id=model_id,
            prompt=original_prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
            resolution=request.target_resolution,
        )

    except OpenRouterError as e:
        raise openrouter_error_to_http(e, "Enhancement failed")
    except HTTPException:
        raise
    except Exception as e:
        raise unexpected_error_to_http(e, "enhancement")
