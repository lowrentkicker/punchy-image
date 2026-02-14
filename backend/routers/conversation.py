"""Multi-turn conversational editing, mask editing, composition, and enhancement endpoints."""

import asyncio
import uuid
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
from backend.services.image_processor import (
    generate_thumbnail,
    image_to_base64_url,
    save_image,
)
from backend.services.mask_processor import (
    build_mask_prompt,
    composite_mask_on_image,
    decode_mask,
    image_to_base64_data_url,
)
from backend.services.openrouter import OpenRouterError, generate_image
from backend.services.prompt_builder import build_prompt
from backend.utils.logging import log_error
from backend.utils.storage import (
    atomic_write_json,
    get_images_dir,
    get_project_dir,
    get_thumbnails_dir,
    read_json,
)

router = APIRouter(tags=["conversation"])

# In-memory store for reference images (shared with generate router)
from backend.routers.generate import _reference_images


# ── Conversation Session CRUD ───────────────────────────────────────────

@router.post("/conversation/sessions", response_model=ConversationSession)
async def create_conversation_session(request: CreateSessionRequest) -> ConversationSession:
    if not get_api_key():
        raise HTTPException(status_code=400, detail="No API key configured")
    if request.model_id not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {request.model_id}")
    return create_session(request.model_id)


@router.get("/conversation/sessions", response_model=list[ConversationSessionSummary])
async def list_conversation_sessions() -> list[ConversationSessionSummary]:
    return list_sessions()


@router.get("/conversation/sessions/{session_id}", response_model=ConversationSession)
async def get_conversation_session(session_id: str) -> ConversationSession:
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/conversation/sessions/{session_id}")
async def delete_conversation_session(session_id: str) -> dict:
    if delete_session(session_id):
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Session not found")


# ── Conversational Editing ──────────────────────────────────────────────

@router.post("/conversation/edit", response_model=GenerateResponse)
async def conversation_edit(request: ConversationEditRequest) -> GenerateResponse:
    """Send a conversational editing turn within a session."""
    if not get_api_key():
        raise HTTPException(status_code=400, detail="No API key configured")

    session = load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    model_id = request.model_id or session.model_id

    if model_id not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_id}")

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
        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        thumbnail_filename = f"{image_id}_thumb.png"

        image_path = get_images_dir() / image_filename
        thumbnail_path = get_thumbnails_dir() / thumbnail_filename

        save_image(result["image_data"], image_path)
        generate_thumbnail(image_path, thumbnail_path)

        timestamp = datetime.now(timezone.utc).isoformat()
        image_url = f"/api/images/default/{image_filename}"
        thumbnail_url = f"/api/images/default/thumbnails/{thumbnail_filename}"

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
        history_entry = {
            "image_id": image_id,
            "image_filename": image_filename,
            "thumbnail_filename": thumbnail_filename,
            "prompt": request.prompt,
            "model_id": model_id,
            "timestamp": timestamp,
            "text_response": result.get("text_response"),
            "usage": result.get("usage"),
            "session_id": request.session_id,
        }
        history_path = get_project_dir() / "history.json"
        history = read_json(history_path)
        if not isinstance(history, list):
            history = []
        history.append(history_entry)
        atomic_write_json(history_path, history)

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
        log_error(f"Conversation edit failed: {e.error_type} - {e.message}")
        # Remove the user turn we added since generation failed
        undo_turn(session)
        raise HTTPException(
            status_code=422,
            detail={"error_type": e.error_type, "message": e.message, "retry_after": e.retry_after},
        )
    except Exception as e:
        log_error(f"Unexpected conversation error: {e}", e)
        undo_turn(session)
        raise HTTPException(
            status_code=500,
            detail={"error_type": "server", "message": "An unexpected error occurred."},
        )


# ── Session Controls ────────────────────────────────────────────────────

@router.post("/conversation/undo/{session_id}")
async def undo_last_turn(session_id: str) -> dict:
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if undo_turn(session):
        return {"undone": True}
    return {"undone": False, "message": "No turns to undo"}


@router.post("/conversation/revert")
async def revert_session(request: RevertRequest) -> dict:
    session = load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if revert_to_turn(session, request.turn_index):
        return {"reverted": True, "turn_index": request.turn_index}
    return {"reverted": False, "message": "Invalid turn index"}


@router.post("/conversation/branch")
async def create_branch(request: BranchRequest) -> dict:
    session = load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        new_branch = branch_from_turn(session, request.turn_index)
        return {"branch_id": new_branch.branch_id, "name": new_branch.name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/conversation/switch-branch/{session_id}/{branch_id}")
async def switch_session_branch(session_id: str, branch_id: str) -> dict:
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if switch_branch(session, branch_id):
        return {"switched": True, "branch_id": branch_id}
    return {"switched": False, "message": "Branch not found"}


@router.post("/conversation/subject-lock")
async def toggle_subject_lock(request: SubjectLockRequest) -> dict:
    session = load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    set_subject_lock(session, request.locked, request.image_id)
    return {"locked": request.locked}


@router.get("/conversation/token-usage/{session_id}")
async def get_token_usage(session_id: str) -> dict:
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return estimate_token_usage(session)


# ── Mask Editing ────────────────────────────────────────────────────────

@router.post("/mask-edit", response_model=GenerateResponse)
async def mask_edit(request: MaskEditRequest) -> GenerateResponse:
    """Edit a masked region of an image."""
    if not get_api_key():
        raise HTTPException(status_code=400, detail="No API key configured")

    if request.model_id not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {request.model_id}")

    source_path = get_images_dir() / f"{request.image_id}.png"
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Source image not found")

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

        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        thumbnail_filename = f"{image_id}_thumb.png"

        img_path = get_images_dir() / image_filename
        thumb_path = get_thumbnails_dir() / thumbnail_filename

        save_image(result["image_data"], img_path)
        generate_thumbnail(img_path, thumb_path)

        timestamp = datetime.now(timezone.utc).isoformat()
        image_url = f"/api/images/default/{image_filename}"
        thumbnail_url = f"/api/images/default/thumbnails/{thumbnail_filename}"

        # Add to history
        history_entry = {
            "image_id": image_id,
            "image_filename": image_filename,
            "thumbnail_filename": thumbnail_filename,
            "prompt": request.prompt,
            "model_id": request.model_id,
            "timestamp": timestamp,
            "text_response": result.get("text_response"),
            "usage": result.get("usage"),
            "source_image_id": request.image_id,
            "edit_type": "mask",
        }
        history_path = get_project_dir() / "history.json"
        history = read_json(history_path)
        if not isinstance(history, list):
            history = []
        history.append(history_entry)
        atomic_write_json(history_path, history)

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
        log_error(f"Mask edit failed: {e.error_type} - {e.message}")
        raise HTTPException(
            status_code=422,
            detail={"error_type": e.error_type, "message": e.message, "retry_after": e.retry_after},
        )
    except Exception as e:
        log_error(f"Unexpected mask edit error: {e}", e)
        raise HTTPException(
            status_code=500,
            detail={"error_type": "server", "message": "An unexpected error occurred."},
        )


# ── Multi-Image Composition ────────────────────────────────────────────

@router.post("/compose", response_model=GenerateResponse)
async def compose_images(request: ComposeRequest) -> GenerateResponse:
    """Combine multiple source images into a single output."""
    if not get_api_key():
        raise HTTPException(status_code=400, detail="No API key configured")

    if request.model_id not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {request.model_id}")

    if len(request.source_images) < 2 or len(request.source_images) > 5:
        raise HTTPException(status_code=400, detail="Provide 2-5 source images")

    # Build composition prompt with labels
    label_parts = []
    image_urls: list[str] = []
    for src in request.source_images:
        ref_id = src.get("reference_id")
        label = src.get("label", "")
        if ref_id:
            url = _reference_images.get(ref_id)
            if url:
                image_urls.append(url)
                if label:
                    label_parts.append(f"Image labeled '{label}'")

    if not image_urls:
        raise HTTPException(status_code=400, detail="No valid source images found")

    compose_instruction = "Compose the provided images into a single cohesive image."
    if label_parts:
        compose_instruction += f" Source images: {', '.join(label_parts)}."

    final_prompt = f"{compose_instruction} {request.prompt}"

    if request.image_weight is not None:
        from backend.services.prompt_builder import _build_image_weight_instruction
        weight_instruction = _build_image_weight_instruction(request.image_weight, request.model_id)
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

        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        thumbnail_filename = f"{image_id}_thumb.png"

        img_path = get_images_dir() / image_filename
        thumb_path = get_thumbnails_dir() / thumbnail_filename

        save_image(result["image_data"], img_path)
        generate_thumbnail(img_path, thumb_path)

        timestamp = datetime.now(timezone.utc).isoformat()

        # Add to history with composition metadata
        history_entry = {
            "image_id": image_id,
            "image_filename": image_filename,
            "thumbnail_filename": thumbnail_filename,
            "prompt": request.prompt,
            "model_id": request.model_id,
            "timestamp": timestamp,
            "text_response": result.get("text_response"),
            "usage": result.get("usage"),
            "edit_type": "compose",
            "source_count": len(request.source_images),
        }
        history_path = get_project_dir() / "history.json"
        history = read_json(history_path)
        if not isinstance(history, list):
            history = []
        history.append(history_entry)
        atomic_write_json(history_path, history)

        return GenerateResponse(
            image_id=image_id,
            image_url=f"/api/images/default/{image_filename}",
            thumbnail_url=f"/api/images/default/thumbnails/{thumbnail_filename}",
            text_response=result.get("text_response"),
            model_id=request.model_id,
            prompt=request.prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
        )

    except OpenRouterError as e:
        log_error(f"Composition failed: {e.error_type} - {e.message}")
        raise HTTPException(
            status_code=422,
            detail={"error_type": e.error_type, "message": e.message, "retry_after": e.retry_after},
        )
    except Exception as e:
        log_error(f"Unexpected composition error: {e}", e)
        raise HTTPException(
            status_code=500,
            detail={"error_type": "server", "message": "An unexpected error occurred."},
        )


# ── Super Resolution / Enhancement ─────────────────────────────────────

@router.post("/enhance", response_model=GenerateResponse)
async def enhance_image(request: EnhanceRequest) -> GenerateResponse:
    """Re-generate an image at higher resolution."""
    if not get_api_key():
        raise HTTPException(status_code=400, detail="No API key configured")

    source_path = get_images_dir() / f"{request.image_id}.png"
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Source image not found")

    # Default to Gemini 3 Pro for best 4K support
    model_id = request.model_id or "google/gemini-3-pro-image-preview"
    if model_id not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_id}")

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

        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        thumbnail_filename = f"{image_id}_thumb.png"

        img_path = get_images_dir() / image_filename
        thumb_path = get_thumbnails_dir() / thumbnail_filename

        save_image(result["image_data"], img_path)
        generate_thumbnail(img_path, thumb_path)

        timestamp = datetime.now(timezone.utc).isoformat()

        history_entry = {
            "image_id": image_id,
            "image_filename": image_filename,
            "thumbnail_filename": thumbnail_filename,
            "prompt": original_prompt,
            "model_id": model_id,
            "timestamp": timestamp,
            "text_response": result.get("text_response"),
            "usage": result.get("usage"),
            "resolution": request.target_resolution,
            "source_image_id": request.image_id,
            "edit_type": "enhance",
        }
        if isinstance(history, list):
            history.append(history_entry)
            atomic_write_json(history_path, history)

        return GenerateResponse(
            image_id=image_id,
            image_url=f"/api/images/default/{image_filename}",
            thumbnail_url=f"/api/images/default/thumbnails/{thumbnail_filename}",
            text_response=result.get("text_response"),
            model_id=model_id,
            prompt=original_prompt,
            timestamp=timestamp,
            usage=result.get("usage"),
            resolution=request.target_resolution,
        )

    except OpenRouterError as e:
        log_error(f"Enhancement failed: {e.error_type} - {e.message}")
        raise HTTPException(
            status_code=422,
            detail={"error_type": e.error_type, "message": e.message, "retry_after": e.retry_after},
        )
    except Exception as e:
        log_error(f"Unexpected enhancement error: {e}", e)
        raise HTTPException(
            status_code=500,
            detail={"error_type": "server", "message": "An unexpected error occurred."},
        )
