"""Pydantic schemas for image generation."""

from pydantic import BaseModel
from typing import Any


class TextInImageConfig(BaseModel):
    text: str
    placement: str = "center"  # top, center, bottom, custom
    size: str = "headline"  # headline, subheading, body, fine_print
    color: str | None = None
    custom_placement: str | None = None  # freeform description when placement="custom"


class GenerateRequest(BaseModel):
    prompt: str
    model_id: str
    request_id: str | None = None
    # Phase 2 fields
    aspect_ratio: str | None = None
    resolution: str | None = None
    style_preset: str | None = None
    negative_prompt: str | None = None
    reference_image_id: str | None = None
    # Phase 3 fields
    image_weight: int | None = None  # 0-100, default 50
    style_reference_id: str | None = None
    character_reference_ids: list[str] | None = None  # 1-5 IDs
    variations: int = 1  # 1-4
    text_in_image: TextInImageConfig | None = None
    batch_id: str | None = None


class GenerateResponse(BaseModel):
    image_id: str
    image_url: str
    thumbnail_url: str
    text_response: str | None = None
    model_id: str
    prompt: str
    timestamp: str
    usage: dict[str, Any] | None = None
    # Phase 2 fields
    aspect_ratio: str | None = None
    resolution: str | None = None
    style_preset: str | None = None
    negative_prompt: str | None = None
    # Phase 3 fields
    image_weight: int | None = None
    batch_id: str | None = None


class BatchGenerateResponse(BaseModel):
    batch_id: str
    results: list[GenerateResponse]
    total_requested: int
    total_completed: int


class GenerationError(BaseModel):
    error_type: str
    message: str
    retry_after: int | None = None


class CostEstimateRequest(BaseModel):
    model_id: str
    resolution: str = "1K"
    variations: int = 1


class CostEstimateResponse(BaseModel):
    estimated_cost: float
    is_approximate: bool
    pricing_type: str


class ReferenceUploadResponse(BaseModel):
    reference_id: str
    was_resized: bool
    thumbnail_url: str


class ExportRequest(BaseModel):
    format: str = "png"  # png, jpeg, webp
    quality: int = 90  # 1-100, for jpeg/webp


class ModelCapability(BaseModel):
    model_id: str
    name: str
    provider: str
    conversational_editing: bool
    multi_image_blending: str
    identity_preservation: str
    text_rendering: str
    max_resolution: str
    relative_cost: str
    speed: str


class ModelRecommendation(BaseModel):
    recommended_model_id: str
    reason: str
    capabilities: list[ModelCapability]
