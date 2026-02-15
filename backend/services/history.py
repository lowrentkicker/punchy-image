"""Centralized history entry creation and persistence."""

from datetime import datetime, timezone
from typing import Any

from backend.utils.storage import atomic_write_json, get_project_dir, read_json


def add_history_entry(
    image_id: str,
    image_filename: str,
    thumbnail_filename: str,
    prompt: str,
    model_id: str,
    result: dict[str, Any],
    project: str = "default",
    **extras: Any,
) -> dict[str, Any]:
    """Create a history entry, persist it to history.json, and return it.

    The ``result`` dict should contain keys from the OpenRouter generation:
    ``text_response``, ``usage`` (both optional).

    Any additional keyword arguments are stored directly on the entry
    (e.g. ``batch_id``, ``session_id``, ``edit_type``, ``source_image_id``).
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    entry: dict[str, Any] = {
        "image_id": image_id,
        "image_filename": image_filename,
        "thumbnail_filename": thumbnail_filename,
        "prompt": prompt,
        "model_id": model_id,
        "timestamp": timestamp,
        "text_response": result.get("text_response"),
        "usage": result.get("usage"),
    }
    entry.update(extras)

    history_path = get_project_dir(project) / "history.json"
    history = read_json(history_path)
    if not isinstance(history, list):
        history = []
    history.append(entry)
    atomic_write_json(history_path, history)

    return entry
