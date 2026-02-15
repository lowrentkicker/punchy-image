"""Project management endpoints: CRUD, switch, export, import."""

import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

MAX_ZIP_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_ZIP_ENTRIES = 10_000

from backend.config import get_config, save_config
from backend.models.project import (
    CreateProjectRequest,
    ProjectInfo,
    ProjectListResponse,
    ProjectSettings,
    RenameProjectRequest,
)
from backend.utils.storage import (
    IMAGEGEN_DIR,
    atomic_write_json,
    get_project_dir,
    list_projects,
    read_json,
)

router = APIRouter(tags=["projects"])


def _get_current_project() -> str:
    config = get_config()
    return config.get("current_project", "default")


def _set_current_project(project_id: str) -> None:
    config = get_config()
    config["current_project"] = project_id
    save_config(config)


def _load_project_info(project_id: str) -> ProjectInfo:
    project_dir = get_project_dir(project_id)
    meta_path = project_dir / "project.json"
    meta = read_json(meta_path)
    return ProjectInfo(
        id=project_id,
        name=meta.get("name", project_id),
        created_at=meta.get("created_at", ""),
        updated_at=meta.get("updated_at", ""),
    )


def _ensure_project_dirs(project_dir: Path) -> None:
    for sub in ["images", "thumbnails", "references", "conversations"]:
        (project_dir / sub).mkdir(parents=True, exist_ok=True)


@router.get("/projects", response_model=ProjectListResponse)
async def list_all_projects() -> ProjectListResponse:
    project_ids = list_projects()
    projects = []
    for pid in project_ids:
        try:
            projects.append(_load_project_info(pid))
        except Exception:
            projects.append(ProjectInfo(id=pid, name=pid, created_at="", updated_at=""))
    return ProjectListResponse(projects=projects, current_project_id=_get_current_project())


@router.post("/projects", response_model=ProjectInfo)
async def create_project(request: CreateProjectRequest) -> ProjectInfo:
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

    project_id = re.sub(r"[^a-z0-9_-]", "", name.lower().replace(" ", "-"))
    if not project_id:
        raise HTTPException(status_code=400, detail="Project name must contain at least one alphanumeric character")
    # Ensure unique
    existing = list_projects()
    if project_id in existing:
        project_id = f"{project_id}-{uuid.uuid4().hex[:6]}"

    project_dir = get_project_dir(project_id)
    _ensure_project_dirs(project_dir)

    now = datetime.now(timezone.utc).isoformat()
    meta = {"name": name, "created_at": now, "updated_at": now}
    atomic_write_json(project_dir / "project.json", meta)
    atomic_write_json(project_dir / "history.json", [])

    return ProjectInfo(id=project_id, name=name, created_at=now, updated_at=now)


@router.get("/projects/{project_id}", response_model=ProjectInfo)
async def get_project(project_id: str) -> ProjectInfo:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return _load_project_info(project_id)


@router.put("/projects/{project_id}", response_model=ProjectInfo)
async def rename_project(project_id: str, request: RenameProjectRequest) -> ProjectInfo:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    if project_id == "default":
        raise HTTPException(status_code=400, detail="Cannot rename the default project")

    meta_path = project_dir / "project.json"
    meta = read_json(meta_path)
    meta["name"] = request.new_name.strip()
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    atomic_write_json(meta_path, meta)

    return _load_project_info(project_id)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str) -> dict:
    if project_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default project")

    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    shutil.rmtree(project_dir)

    # Switch to default if this was the active project
    if _get_current_project() == project_id:
        _set_current_project("default")

    return {"deleted": True}


@router.post("/projects/{project_id}/switch")
async def switch_project(project_id: str) -> dict:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    _set_current_project(project_id)
    return {"switched": True, "current_project_id": project_id}


@router.get("/projects/{project_id}/settings", response_model=ProjectSettings)
async def get_project_settings(project_id: str) -> ProjectSettings:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    meta = read_json(project_dir / "project.json")
    settings = meta.get("settings", {})
    return ProjectSettings(**settings)


@router.put("/projects/{project_id}/settings", response_model=ProjectSettings)
async def update_project_settings(project_id: str, settings: ProjectSettings) -> ProjectSettings:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    meta_path = project_dir / "project.json"
    meta = read_json(meta_path)
    meta["settings"] = settings.model_dump(exclude_none=True)
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    atomic_write_json(meta_path, meta)
    return settings


@router.get("/projects/{project_id}/export")
async def export_project(project_id: str) -> StreamingResponse:
    project_dir = get_project_dir(project_id)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    buf = BytesIO()
    resolved_root = project_dir.resolve()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in project_dir.rglob("*"):
            if file_path.is_symlink():
                continue
            if not file_path.is_file():
                continue
            if not str(file_path.resolve()).startswith(str(resolved_root)):
                continue
            arcname = file_path.relative_to(project_dir)
            zf.write(file_path, arcname)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project_id}.zip"'},
    )


@router.post("/projects/import")
async def import_project(file: UploadFile) -> ProjectInfo:
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    raw = await file.read()
    if len(raw) > MAX_ZIP_SIZE:
        raise HTTPException(status_code=413, detail=f"ZIP file exceeds {MAX_ZIP_SIZE // (1024 * 1024)}MB limit")

    buf = BytesIO(raw)

    # Derive project name from zip filename
    base_name = Path(file.filename).stem
    project_id = re.sub(r"[^a-z0-9_-]", "", base_name.lower().replace(" ", "-"))
    if not project_id:
        project_id = f"import-{uuid.uuid4().hex[:6]}"
    existing = list_projects()
    if project_id in existing:
        project_id = f"{project_id}-{uuid.uuid4().hex[:6]}"

    project_dir = get_project_dir(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)
    resolved_root = project_dir.resolve()

    with zipfile.ZipFile(buf, "r") as zf:
        members = zf.namelist()
        if len(members) > MAX_ZIP_ENTRIES:
            shutil.rmtree(project_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"ZIP contains too many entries (max {MAX_ZIP_ENTRIES})")
        for member in members:
            member_path = (project_dir / member).resolve()
            if not str(member_path).startswith(str(resolved_root)):
                shutil.rmtree(project_dir, ignore_errors=True)
                raise HTTPException(status_code=400, detail="ZIP contains invalid path traversal entries")
        zf.extractall(project_dir)

    _ensure_project_dirs(project_dir)

    # Create metadata if not present in the zip
    meta_path = project_dir / "project.json"
    if not meta_path.exists():
        now = datetime.now(timezone.utc).isoformat()
        atomic_write_json(meta_path, {"name": base_name, "created_at": now, "updated_at": now})

    return _load_project_info(project_id)
