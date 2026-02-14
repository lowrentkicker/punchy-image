"""Storage usage, quota management, cost tracking, and connectivity endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from backend.config import get_config, save_config
from backend.models.project import (
    ConnectivityStatusResponse,
    CostTrackingResponse,
    FallbackSuggestion,
    ProjectStorageUsage,
    SetQuotaRequest,
    SetSpendLimitRequest,
    SpendLogEntry,
    StorageUsageResponse,
)
from backend.services.cost_estimator import (
    get_all_time_total,
    get_recent_entries,
    get_session_total,
    get_spend_log_path,
)
from backend.services.model_recommender import get_fallback_suggestion
from backend.utils.connectivity import check_connectivity, get_status
from backend.utils.storage import IMAGEGEN_DIR, get_dir_size, get_project_dir, list_projects, read_json

router = APIRouter(tags=["storage"])

DEFAULT_QUOTA_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB


# --- Storage Usage ---

@router.get("/storage/usage", response_model=StorageUsageResponse)
async def get_storage_usage() -> StorageUsageResponse:
    config = get_config()
    quota = config.get("storage_quota_bytes", DEFAULT_QUOTA_BYTES)

    project_ids = list_projects()
    by_project: list[ProjectStorageUsage] = []
    total = 0

    for pid in project_ids:
        project_dir = get_project_dir(pid)
        size = get_dir_size(project_dir)
        total += size

        meta = read_json(project_dir / "project.json")
        name = meta.get("name", pid)
        by_project.append(ProjectStorageUsage(
            project_id=pid,
            project_name=name,
            bytes_used=size,
        ))

    by_project.sort(key=lambda p: p.bytes_used, reverse=True)
    percentage = (total / quota * 100) if quota > 0 else 0

    return StorageUsageResponse(
        total_bytes=total,
        quota_bytes=quota,
        percentage=round(percentage, 1),
        by_project=by_project,
    )


@router.post("/storage/set-quota")
async def set_storage_quota(request: SetQuotaRequest) -> dict:
    if request.quota_bytes < 100 * 1024 * 1024:  # Minimum 100MB
        raise HTTPException(status_code=400, detail="Quota must be at least 100MB")
    config = get_config()
    config["storage_quota_bytes"] = request.quota_bytes
    save_config(config)
    return {"quota_bytes": request.quota_bytes}


# --- Cost Tracking ---

@router.get("/cost-tracking", response_model=CostTrackingResponse)
async def get_cost_tracking() -> CostTrackingResponse:
    config = get_config()
    spend_limit = config.get("spend_limit")
    entries = get_recent_entries(100)

    return CostTrackingResponse(
        session_total=round(get_session_total(), 4),
        all_time_total=round(get_all_time_total(), 4),
        spend_limit=spend_limit,
        recent_entries=[SpendLogEntry(**e) for e in entries],
    )


@router.post("/cost-tracking/set-limit")
async def set_spend_limit(request: SetSpendLimitRequest) -> dict:
    config = get_config()
    if request.limit is None:
        config.pop("spend_limit", None)
    else:
        config["spend_limit"] = request.limit
    save_config(config)
    return {"spend_limit": request.limit}


@router.get("/cost-tracking/export")
async def export_cost_log() -> Response:
    log_path = get_spend_log_path()
    if not log_path.exists():
        return Response(
            content="date,model_id,model_name,resolution,variations,estimated_cost\n",
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="imagegen_spend_log.csv"'},
        )
    return Response(
        content=log_path.read_text(encoding="utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="imagegen_spend_log.csv"'},
    )


# --- Connectivity ---

@router.get("/connectivity", response_model=ConnectivityStatusResponse)
async def get_connectivity() -> ConnectivityStatusResponse:
    await check_connectivity()
    status = get_status()
    return ConnectivityStatusResponse(
        online=status["online"],
        last_checked=str(status["last_checked"]),
    )


# --- Fallback Suggestions ---

@router.get("/fallback/{model_id}")
async def get_fallback(model_id: str) -> FallbackSuggestion:
    suggestion = get_fallback_suggestion(model_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="No fallback available")
    return suggestion
