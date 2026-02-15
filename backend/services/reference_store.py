"""LRU-bounded in-memory cache for reference image data URLs.

Disk copies in the project's references/ directory are the source of truth.
The cache avoids re-reading and re-encoding on every generation request.
"""

import collections
from pathlib import Path

from backend.services.image_processor import image_to_base64_url
from backend.utils.storage import get_references_dir

MAX_CACHE_SIZE = 20


class _ReferenceCache:
    """LRU cache for reference image base64 data URLs."""

    def __init__(self, max_size: int = MAX_CACHE_SIZE):
        self._cache: collections.OrderedDict[str, str] = collections.OrderedDict()
        self._max_size = max_size

    def store(self, reference_id: str, data_url: str) -> None:
        if reference_id in self._cache:
            self._cache.move_to_end(reference_id)
            self._cache[reference_id] = data_url
        else:
            self._cache[reference_id] = data_url
            if len(self._cache) > self._max_size:
                self._cache.popitem(last=False)

    def get(self, reference_id: str) -> str | None:
        """Get a reference data URL. Falls back to disk if evicted from cache."""
        if reference_id in self._cache:
            self._cache.move_to_end(reference_id)
            return self._cache[reference_id]

        # Cache miss — try loading from disk
        ref_path = get_references_dir() / f"{reference_id}.jpg"
        if ref_path.exists():
            data_url = image_to_base64_url(ref_path.read_bytes())
            self.store(reference_id, data_url)
            return data_url

        return None

    def delete(self, reference_id: str) -> None:
        self._cache.pop(reference_id, None)

    def __len__(self) -> int:
        return len(self._cache)


_store = _ReferenceCache()


def store_reference(reference_id: str, data_url: str) -> None:
    """Store a reference image data URL in the cache."""
    _store.store(reference_id, data_url)


def get_reference(reference_id: str) -> str | None:
    """Retrieve a reference data URL (from cache or disk fallback)."""
    return _store.get(reference_id)


def delete_reference(reference_id: str) -> None:
    """Remove a reference from the cache."""
    _store.delete(reference_id)


def resolve_reference_urls(
    reference_image_id: str | None = None,
    style_reference_id: str | None = None,
    character_reference_ids: list[str] | None = None,
) -> tuple[str | None, list[str]]:
    """Resolve reference IDs to data URLs.

    Returns (primary_url, additional_urls).
    """
    primary_url = None
    if reference_image_id:
        primary_url = get_reference(reference_image_id)

    additional_urls: list[str] = []
    if style_reference_id:
        url = get_reference(style_reference_id)
        if url:
            additional_urls.append(url)
    if character_reference_ids:
        for char_id in character_reference_ids:
            url = get_reference(char_id)
            if url:
                additional_urls.append(url)

    return primary_url, additional_urls
