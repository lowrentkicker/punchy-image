"""Generation history CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from backend.models.history import HistoryEntry, HistoryListResponse
from backend.utils.storage import atomic_write_json, get_project_dir, read_json

router = APIRouter(tags=["history"])


@router.get("/history", response_model=HistoryListResponse)
async def get_history() -> HistoryListResponse:
    history_path = get_project_dir() / "history.json"
    entries = read_json(history_path)
    if not isinstance(entries, list):
        entries = []
    entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return HistoryListResponse(
        entries=[HistoryEntry(**e) for e in entries],
        total=len(entries),
    )


@router.delete("/history/{image_id}")
async def delete_history_entry(image_id: str) -> dict:
    history_path = get_project_dir() / "history.json"
    entries = read_json(history_path)
    if not isinstance(entries, list):
        raise HTTPException(status_code=404)

    updated = [e for e in entries if e.get("image_id") != image_id]
    if len(updated) == len(entries):
        raise HTTPException(status_code=404, detail="Entry not found")

    # Delete image and thumbnail files
    project_dir = get_project_dir()
    (project_dir / "images" / f"{image_id}.png").unlink(missing_ok=True)
    (project_dir / "thumbnails" / f"{image_id}_thumb.png").unlink(missing_ok=True)

    atomic_write_json(history_path, updated)
    return {"deleted": True}
