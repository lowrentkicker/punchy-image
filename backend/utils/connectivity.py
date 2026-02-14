"""Online/offline detection via OpenRouter API endpoint."""

import asyncio
from datetime import datetime, timezone

import httpx

_online: bool = True
_last_checked: str = ""
_check_lock = asyncio.Lock()

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models"
CHECK_TIMEOUT = 5.0


async def check_connectivity() -> bool:
    """Check if OpenRouter API is reachable. Updates cached state."""
    global _online, _last_checked
    async with _check_lock:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(OPENROUTER_API_URL, timeout=CHECK_TIMEOUT)
                _online = resp.status_code < 500
        except (httpx.ConnectError, httpx.TimeoutException, OSError):
            _online = False
        _last_checked = datetime.now(timezone.utc).isoformat()
        return _online


def get_status() -> dict[str, str | bool]:
    """Return cached connectivity status."""
    return {"online": _online, "last_checked": _last_checked}


def is_online() -> bool:
    """Return cached online status."""
    return _online
