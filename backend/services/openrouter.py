"""OpenRouter API client with error handling and retry logic."""

import asyncio
import base64
import json
from typing import Any

import httpx

from backend.config import MODELS, get_api_key
from backend.services.image_processor import compress_for_size_limit, image_to_base64_url
from backend.utils.logging import log_error

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
TIMEOUT = 120.0
MAX_RETRIES = 3
BACKOFF_BASE = 2

# Shared httpx client for connection pooling (initialized via startup/shutdown)
_client: httpx.AsyncClient | None = None


def startup() -> None:
    """Create the shared httpx client. Call from app lifespan startup."""
    global _client
    _client = httpx.AsyncClient(timeout=TIMEOUT)


async def shutdown() -> None:
    """Close the shared httpx client. Call from app lifespan shutdown."""
    global _client
    if _client:
        await _client.aclose()
        _client = None


def _get_client() -> httpx.AsyncClient:
    """Return the shared client, or create a fallback if not initialized."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=TIMEOUT)
    return _client


class OpenRouterError(Exception):
    """Typed error from OpenRouter API calls."""

    def __init__(
        self,
        error_type: str,
        message: str,
        retry_after: int | None = None,
    ):
        self.error_type = error_type
        self.message = message
        self.retry_after = retry_after
        super().__init__(message)


def _build_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Punchy Image",
    }


def _parse_response(data: dict[str, Any], model_info: dict[str, Any]) -> dict[str, Any]:
    """Extract image bytes and optional text from OpenRouter response."""
    choices = data.get("choices", [])
    if not choices:
        raise OpenRouterError("server", "No choices in response")

    message = choices[0].get("message", {})

    # Extract image from the images array
    images = message.get("images", [])
    if not images:
        # Some models may return image data inline in content
        content = message.get("content", "")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    url = part.get("image_url", {}).get("url", "")
                    if url.startswith("data:image/"):
                        images = [{"image_url": {"url": url}}]
                        break

    if not images:
        raise OpenRouterError("server", "No image returned by model")

    image_url = images[0].get("image_url", {}).get("url", "")
    if not image_url.startswith("data:image/"):
        raise OpenRouterError("server", "Invalid image data in response")

    # Strip data URI prefix and decode base64
    base64_data = image_url.split(",", 1)[1]
    image_bytes = base64.b64decode(base64_data)

    # Extract text response (conversational models only)
    text_response = None
    if model_info["type"] == "conversational":
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            text_response = content.strip()
        elif isinstance(content, list):
            text_parts = [
                p.get("text", "") for p in content
                if isinstance(p, dict) and p.get("type") == "text"
            ]
            combined = " ".join(t for t in text_parts if t).strip()
            if combined:
                text_response = combined

    return {
        "image_data": image_bytes,
        "text_response": text_response,
        "usage": data.get("usage"),
    }


def _handle_error_status(response: httpx.Response, attempt: int) -> None:
    """Translate HTTP status codes to OpenRouterError. Returns to allow retry if applicable."""
    status = response.status_code
    try:
        body = response.json()
    except Exception:
        body = {}

    error_msg = body.get("error", {}).get("message", response.text[:200])

    if status == 401:
        raise OpenRouterError("auth", "Invalid API key. Update it in Settings.")
    elif status == 402:
        raise OpenRouterError("credits", "Insufficient credits. Add credits at openrouter.ai.")
    elif status == 429:
        retry_after = int(response.headers.get("Retry-After", str(BACKOFF_BASE ** (attempt + 1))))
        if attempt >= MAX_RETRIES - 1:
            raise OpenRouterError(
                "rate_limit",
                "Rate limited. Please wait and try again.",
                retry_after=retry_after,
            )
        return  # Allow retry
    elif status == 400:
        lower_msg = error_msg.lower()
        if "safety" in lower_msg or "content" in lower_msg or "policy" in lower_msg:
            raise OpenRouterError(
                "content_policy",
                "Your prompt was flagged by the model's content policy. Try adjusting your prompt.",
            )
        raise OpenRouterError("server", f"Bad request: {error_msg}")
    elif status == 413:
        raise OpenRouterError("server", "Request too large. Try a shorter prompt or smaller image.")
    elif status in (500, 502, 503):
        if attempt >= MAX_RETRIES - 1:
            raise OpenRouterError(
                "server",
                f"Server error ({status}). The model may be temporarily unavailable.",
            )
        return  # Allow retry
    else:
        raise OpenRouterError("server", f"Unexpected error ({status}): {error_msg}")


def _compress_payload_images(payload: dict[str, Any], max_bytes: int) -> None:
    """Compress base64 images in the payload until total size fits within max_bytes.

    Modifies the payload in place. Raises OpenRouterError if images can't be
    compressed enough to fit.
    """
    # Reserve headroom for JSON structure, prompt text, etc.
    overhead = max_bytes // 10  # 10% buffer
    target = max_bytes - overhead

    for msg in payload.get("messages", []):
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict) or part.get("type") != "image_url":
                continue
            url = part.get("image_url", {}).get("url", "")
            if not url.startswith("data:image/"):
                continue
            # Decode the current base64 image
            b64_data = url.split(",", 1)[1]
            image_bytes = base64.b64decode(b64_data)
            # Budget: split target evenly across remaining images (conservative)
            per_image_budget = target // 2  # generous per-image allowance
            try:
                compressed = compress_for_size_limit(image_bytes, per_image_budget)
            except ValueError:
                raise OpenRouterError(
                    "server",
                    "Reference image too large for this model's 4.5MB request limit. "
                    "Try using a smaller image.",
                )
            del image_bytes  # Free original decoded bytes before re-encoding
            part["image_url"]["url"] = image_to_base64_url(compressed)
            del compressed  # Free compressed bytes after encoding to base64

    # Final size check
    final_size = len(json.dumps(payload).encode())
    if final_size > max_bytes:
        raise OpenRouterError(
            "server",
            f"Request payload ({final_size // 1024}KB) exceeds this model's "
            f"{max_bytes // (1024 * 1024)}MB limit even after compression. "
            "Try using fewer or smaller reference images.",
        )


async def test_connection() -> tuple[bool, str]:
    """Test the API key with a lightweight request."""
    api_key = get_api_key()
    if not api_key:
        return False, "No API key configured"

    client = _get_client()
    try:
        response = await client.get(
            "https://openrouter.ai/api/v1/models",
            headers=_build_headers(api_key),
            timeout=15.0,
        )
        if response.status_code == 200:
            return True, "Connection successful"
        elif response.status_code == 401:
            return False, "Invalid API key"
        elif response.status_code == 402:
            return False, "Insufficient credits on your OpenRouter account"
        else:
            return False, f"Unexpected response: {response.status_code}"
    except httpx.ConnectError:
        return False, "Unable to connect to OpenRouter. Check your internet connection."
    except httpx.TimeoutException:
        return False, "Connection timed out"


async def generate_image(
    prompt: str,
    model_id: str,
    cancel_event: asyncio.Event | None = None,
    reference_image_url: str | None = None,
    aspect_ratio: str | None = None,
    resolution: str | None = None,
    additional_image_urls: list[str] | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Send an image generation request to OpenRouter.

    Args:
        reference_image_url: Primary reference image (Phase 2 single reference).
        additional_image_urls: Extra images (style ref, character refs) to include in the request.
        conversation_history: Previous messages for multi-turn conversational editing (Phase 4).

    Returns dict with keys: image_data (bytes), text_response (str|None), usage (dict|None).
    Raises OpenRouterError on failure.
    """
    api_key = get_api_key()
    if not api_key:
        raise OpenRouterError("auth", "No API key configured")

    if model_id not in MODELS:
        raise OpenRouterError("server", f"Unknown model: {model_id}")

    model_info = MODELS[model_id]

    # Build message content (text + optional reference images)
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    if reference_image_url:
        content.append({
            "type": "image_url",
            "image_url": {"url": reference_image_url},
        })
    if additional_image_urls:
        for img_url in additional_image_urls:
            content.append({
                "type": "image_url",
                "image_url": {"url": img_url},
            })

    # Build messages array — include conversation history for multi-turn editing
    messages: list[dict[str, Any]] = []
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": content})

    payload: dict[str, Any] = {
        "model": model_id,
        "modalities": list(model_info["modalities"]),
        "messages": messages,
    }

    # Add image_config for aspect ratio and resolution
    image_config: dict[str, str] = {}
    if aspect_ratio:
        image_config["aspect_ratio"] = aspect_ratio
    if resolution:
        image_config["image_size"] = resolution
    if image_config:
        payload["image_config"] = image_config

    # Enforce per-model request size limits (e.g. Sourceful's 4.5MB cap)
    max_request_bytes = model_info.get("max_request_bytes")
    if max_request_bytes:
        payload_size = len(json.dumps(payload).encode())
        if payload_size > max_request_bytes:
            # Find and compress base64 images in the message content to fit
            _compress_payload_images(payload, max_request_bytes)

    headers = _build_headers(api_key)

    for attempt in range(MAX_RETRIES):
        if cancel_event and cancel_event.is_set():
            raise OpenRouterError("timeout", "Generation cancelled by user")

        try:
            client = _get_client()
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=TIMEOUT,
            )

            if response.status_code == 200:
                return _parse_response(response.json(), model_info)

            _handle_error_status(response, attempt)

        except OpenRouterError:
            raise
        except httpx.TimeoutException:
            raise OpenRouterError("timeout", "Request timed out after 120 seconds")
        except httpx.ConnectError:
            raise OpenRouterError("network", "Unable to connect to OpenRouter. Check your internet connection.")
        except Exception as e:
            log_error(f"Unexpected error during generation: {e}", e)
            raise OpenRouterError("server", f"Unexpected error: {str(e)}")

        # Backoff before retry
        backoff = BACKOFF_BASE ** (attempt + 1)
        if cancel_event:
            try:
                await asyncio.wait_for(cancel_event.wait(), timeout=backoff)
                raise OpenRouterError("timeout", "Generation cancelled by user")
            except asyncio.TimeoutError:
                pass  # Backoff completed without cancellation
        else:
            await asyncio.sleep(backoff)

    raise OpenRouterError("server", "Max retries exceeded")
