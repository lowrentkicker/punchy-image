"""Pydantic schemas for generation history."""

from pydantic import BaseModel
from typing import Any


class HistoryEntry(BaseModel):
    image_id: str
    image_filename: str
    thumbnail_filename: str
    prompt: str
    model_id: str
    timestamp: str
    text_response: str | None = None
    usage: dict[str, Any] | None = None


class HistoryListResponse(BaseModel):
    entries: list[HistoryEntry]
    total: int
