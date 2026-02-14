"""Filesystem operations with atomic writes and directory helpers."""

import json
import os
from pathlib import Path
from typing import Any

IMAGEGEN_DIR = Path.home() / ".imagegen"


def atomic_write(path: Path, data: str) -> None:
    """Write data to a file atomically using write-to-temp-then-rename."""
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(data, encoding="utf-8")
    os.replace(str(tmp_path), str(path))


def atomic_write_json(path: Path, data: Any) -> None:
    """Serialize data as JSON and write atomically."""
    atomic_write(path, json.dumps(data, indent=2, default=str))


def read_json(path: Path) -> Any:
    """Read and parse a JSON file. Returns [] for missing/empty list files, {} otherwise."""
    if not path.exists():
        return [] if "history" in path.name else {}
    try:
        text = path.read_text(encoding="utf-8")
        return json.loads(text)
    except (json.JSONDecodeError, OSError):
        return [] if "history" in path.name else {}


def get_project_dir(project: str = "default") -> Path:
    """Get the directory for a project."""
    return IMAGEGEN_DIR / "projects" / project


def get_images_dir(project: str = "default") -> Path:
    """Get the images directory for a project."""
    return get_project_dir(project) / "images"


def get_thumbnails_dir(project: str = "default") -> Path:
    """Get the thumbnails directory for a project."""
    return get_project_dir(project) / "thumbnails"


def get_references_dir(project: str = "default") -> Path:
    """Get the references directory for a project."""
    return get_project_dir(project) / "references"


def get_conversations_dir(project: str = "default") -> Path:
    """Get the conversations directory for a project."""
    return get_project_dir(project) / "conversations"


def get_templates_dir() -> Path:
    """Get the templates directory."""
    return IMAGEGEN_DIR / "templates"


def get_spend_log_path() -> Path:
    """Get the path to the spend log CSV."""
    return IMAGEGEN_DIR / "spend_log.csv"


def list_projects() -> list[str]:
    """List all project directory names."""
    projects_dir = IMAGEGEN_DIR / "projects"
    if not projects_dir.exists():
        return ["default"]
    return sorted(
        d.name for d in projects_dir.iterdir() if d.is_dir()
    ) or ["default"]


def get_dir_size(path: Path) -> int:
    """Recursively compute total bytes used by a directory."""
    if not path.exists():
        return 0
    total = 0
    for f in path.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total
