"""Pydantic schemas for settings and model information."""

from pydantic import BaseModel


class ApiKeyRequest(BaseModel):
    api_key: str


class ApiKeyStatus(BaseModel):
    configured: bool


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    modalities: list[str]
    strengths: str
    estimated_cost_1k: float | None = None


class ModelListResponse(BaseModel):
    models: list[ModelInfo]
