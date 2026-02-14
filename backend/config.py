"""Application configuration and model definitions."""

import json
from pathlib import Path
from typing import Any

from backend.utils.storage import atomic_write_json, read_json

IMAGEGEN_DIR = Path.home() / ".imagegen"
CONFIG_PATH = IMAGEGEN_DIR / "config.json"

MODELS: dict[str, dict[str, Any]] = {
    "google/gemini-2.5-flash-image": {
        "id": "google/gemini-2.5-flash-image",
        "name": "Gemini 2.5 Flash",
        "provider": "Google",
        "type": "conversational",
        "modalities": ["image", "text"],
        "strengths": "Fast, cost-effective, multi-image blending, character consistency",
        "estimated_cost_1k": 0.039,
    },
    "google/gemini-3-pro-image-preview": {
        "id": "google/gemini-3-pro-image-preview",
        "name": "Gemini 3 Pro",
        "provider": "Google",
        "type": "conversational",
        "modalities": ["image", "text"],
        "strengths": "Highest fidelity, identity preservation, text rendering, 4K output",
        "estimated_cost_1k": None,
    },
    "openai/gpt-5-image": {
        "id": "openai/gpt-5-image",
        "name": "GPT-5 Image",
        "provider": "OpenAI",
        "type": "conversational",
        "modalities": ["image", "text"],
        "strengths": "Strong instruction following, text rendering, detailed editing",
        "estimated_cost_1k": None,
    },
    "black-forest-labs/flux.2-max": {
        "id": "black-forest-labs/flux.2-max",
        "name": "Flux.2 Max",
        "provider": "Black Forest Labs",
        "type": "image_only",
        "modalities": ["image"],
        "strengths": "Top-tier image quality, prompt understanding, editing consistency",
        "estimated_cost_1k": 0.07,
    },
    "bytedance-seed/seedream-4.5": {
        "id": "bytedance-seed/seedream-4.5",
        "name": "Seedream 4.5",
        "provider": "ByteDance",
        "type": "image_only",
        "modalities": ["image"],
        "strengths": "Subject detail preservation, portrait refinement, visual aesthetics",
        "estimated_cost_1k": 0.04,
    },
}


def is_conversational(model_id: str) -> bool:
    """Check if a model supports conversational (multi-turn) interaction."""
    model = MODELS.get(model_id)
    if not model:
        return False
    return model["type"] == "conversational"


def get_config() -> dict[str, Any]:
    """Read the application config file."""
    return read_json(CONFIG_PATH)


def save_config(config: dict[str, Any]) -> None:
    """Write the application config file atomically."""
    atomic_write_json(CONFIG_PATH, config)


def get_api_key() -> str | None:
    """Get the OpenRouter API key from config, or None if not set."""
    config = get_config()
    return config.get("api_key")


def set_api_key(key: str) -> None:
    """Store the OpenRouter API key in config."""
    config = get_config()
    config["api_key"] = key
    save_config(config)


def remove_api_key() -> None:
    """Remove the OpenRouter API key from config."""
    config = get_config()
    config.pop("api_key", None)
    save_config(config)
