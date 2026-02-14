"""Pydantic schemas for multi-turn conversational editing sessions."""

from pydantic import BaseModel
from typing import Any


class ConversationTurn(BaseModel):
    turn_id: str
    role: str  # "user" or "assistant"
    prompt: str | None = None  # User's instruction
    image_id: str | None = None  # Generated image for this turn
    image_url: str | None = None
    thumbnail_url: str | None = None
    text_response: str | None = None  # Model's text response
    timestamp: str
    usage: dict[str, Any] | None = None


class ConversationBranch(BaseModel):
    branch_id: str
    name: str  # e.g., "main", "branch-1"
    parent_branch_id: str | None = None
    fork_turn_index: int | None = None  # Turn index in parent where this branched
    turns: list[ConversationTurn] = []


class ConversationSession(BaseModel):
    session_id: str
    project: str = "default"
    model_id: str
    created_at: str
    updated_at: str
    branches: list[ConversationBranch] = []
    active_branch_id: str = "main"
    subject_locked: bool = False
    subject_lock_image_id: str | None = None


class ConversationSessionSummary(BaseModel):
    session_id: str
    model_id: str
    created_at: str
    updated_at: str
    turn_count: int
    branch_count: int
    last_image_url: str | None = None


class CreateSessionRequest(BaseModel):
    model_id: str


class ConversationEditRequest(BaseModel):
    session_id: str
    prompt: str
    # Optional overrides
    model_id: str | None = None
    aspect_ratio: str | None = None
    resolution: str | None = None
    style_preset: str | None = None
    negative_prompt: str | None = None
    image_weight: int | None = None
    text_in_image: dict | None = None


class BranchRequest(BaseModel):
    session_id: str
    turn_index: int  # Fork from this turn


class RevertRequest(BaseModel):
    session_id: str
    turn_index: int  # Revert to this turn (remove all after)


class SubjectLockRequest(BaseModel):
    session_id: str
    locked: bool
    image_id: str | None = None  # Image to lock as reference


class MaskData(BaseModel):
    """Mask information for region editing."""
    mask_image_base64: str  # Base64-encoded PNG mask (white = edit region)
    description: str | None = None  # Natural language description of the masked region


class MaskEditRequest(BaseModel):
    image_id: str  # Source image to edit
    mask: MaskData
    prompt: str  # What should appear in the masked region
    model_id: str
    session_id: str | None = None  # If part of a conversation


class ComposeRequest(BaseModel):
    """Multi-image composition request."""
    source_images: list[dict]  # [{reference_id, label}]
    prompt: str
    model_id: str
    image_weight: int | None = None
    aspect_ratio: str | None = None
    resolution: str | None = None


class EnhanceRequest(BaseModel):
    """Super resolution / image enhancement request."""
    image_id: str
    target_resolution: str  # "2K" or "4K"
    model_id: str | None = None  # If None, backend recommends
