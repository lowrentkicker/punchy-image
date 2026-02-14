"""API key management and model listing endpoints."""

from fastapi import APIRouter

from backend.config import MODELS, get_api_key, remove_api_key, set_api_key
from backend.models.config import (
    ApiKeyRequest,
    ApiKeyStatus,
    ModelInfo,
    ModelListResponse,
    TestConnectionResponse,
)
from backend.services.openrouter import test_connection

router = APIRouter(tags=["settings"])


@router.get("/settings/api-key/status", response_model=ApiKeyStatus)
async def get_api_key_status() -> ApiKeyStatus:
    return ApiKeyStatus(configured=get_api_key() is not None)


@router.post("/settings/api-key", response_model=ApiKeyStatus)
async def update_api_key(request: ApiKeyRequest) -> ApiKeyStatus:
    set_api_key(request.api_key)
    return ApiKeyStatus(configured=True)


@router.delete("/settings/api-key", response_model=ApiKeyStatus)
async def delete_api_key() -> ApiKeyStatus:
    remove_api_key()
    return ApiKeyStatus(configured=False)


@router.post("/settings/test-connection", response_model=TestConnectionResponse)
async def test_api_connection() -> TestConnectionResponse:
    success, message = await test_connection()
    return TestConnectionResponse(success=success, message=message)


@router.get("/models", response_model=ModelListResponse)
async def list_models() -> ModelListResponse:
    models = [ModelInfo(**m) for m in MODELS.values()]
    return ModelListResponse(models=models)
