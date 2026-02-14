"""Smart model recommendation based on current generation context, with fallback suggestions."""

from backend.config import MODELS
from backend.models.generation import ModelCapability, ModelRecommendation
from backend.models.project import FallbackSuggestion

# Capability matrix per PRD Appendix A
CAPABILITIES: dict[str, dict[str, str | bool]] = {
    "google/gemini-2.5-flash-image": {
        "conversational_editing": True,
        "multi_image_blending": "Yes (native)",
        "identity_preservation": "Yes",
        "text_rendering": "Good",
        "max_resolution": "Verify at dev time",
        "relative_cost": "Low",
        "speed": "Fast",
    },
    "google/gemini-3-pro-image-preview": {
        "conversational_editing": True,
        "multi_image_blending": "Yes (native, fine-grained)",
        "identity_preservation": "Yes (up to 5 subjects)",
        "text_rendering": "Industry-leading",
        "max_resolution": "4K",
        "relative_cost": "Medium-High",
        "speed": "Medium",
    },
    "openai/gpt-5-image": {
        "conversational_editing": True,
        "multi_image_blending": "Yes (via messages)",
        "identity_preservation": "Yes (via context)",
        "text_rendering": "Strong",
        "max_resolution": "Verify at dev time",
        "relative_cost": "High",
        "speed": "Medium",
    },
    "black-forest-labs/flux.2-max": {
        "conversational_editing": False,
        "multi_image_blending": "Limited",
        "identity_preservation": "Via reference",
        "text_rendering": "Varies",
        "max_resolution": "Per megapixel",
        "relative_cost": "Medium",
        "speed": "Medium",
    },
    "bytedance-seed/seedream-4.5": {
        "conversational_editing": False,
        "multi_image_blending": "Yes (native)",
        "identity_preservation": "Via reference",
        "text_rendering": "Improved (small text)",
        "max_resolution": "Verify at dev time",
        "relative_cost": "Low",
        "speed": "Medium",
    },
}


def _get_capabilities_list() -> list[ModelCapability]:
    """Build the full capability list for all models."""
    result = []
    for model_id, model_info in MODELS.items():
        caps = CAPABILITIES.get(model_id, {})
        result.append(ModelCapability(
            model_id=model_id,
            name=model_info["name"],
            provider=model_info["provider"],
            conversational_editing=caps.get("conversational_editing", False),
            multi_image_blending=str(caps.get("multi_image_blending", "Unknown")),
            identity_preservation=str(caps.get("identity_preservation", "Unknown")),
            text_rendering=str(caps.get("text_rendering", "Unknown")),
            max_resolution=str(caps.get("max_resolution", "Unknown")),
            relative_cost=str(caps.get("relative_cost", "Unknown")),
            speed=str(caps.get("speed", "Unknown")),
        ))
    return result


def recommend_model(
    has_text_in_image: bool = False,
    style_preset: str | None = None,
    resolution: str | None = None,
    has_character_refs: bool = False,
) -> ModelRecommendation:
    """Recommend a model based on the current generation context.

    Priority logic:
    1. Text in Image → Gemini 3 Pro (industry-leading text rendering)
    2. Product Photography preset → Gemini 3 Pro
    3. 4K resolution → Gemini 3 Pro (confirmed 4K support)
    4. Character references → Gemini 3 Pro (up to 5 subjects)
    5. Default → Gemini 2.5 Flash (best cost/quality)
    """
    capabilities = _get_capabilities_list()

    if has_text_in_image:
        return ModelRecommendation(
            recommended_model_id="google/gemini-3-pro-image-preview",
            reason="Best text rendering — industry-leading accuracy for text in images",
            capabilities=capabilities,
        )

    if style_preset == "product_photography":
        return ModelRecommendation(
            recommended_model_id="google/gemini-3-pro-image-preview",
            reason="Highest fidelity for product photography with fine-grained control",
            capabilities=capabilities,
        )

    if resolution == "4K":
        return ModelRecommendation(
            recommended_model_id="google/gemini-3-pro-image-preview",
            reason="Confirmed 4K output support for maximum resolution",
            capabilities=capabilities,
        )

    if has_character_refs:
        return ModelRecommendation(
            recommended_model_id="google/gemini-3-pro-image-preview",
            reason="Best identity preservation with support for up to 5 subjects",
            capabilities=capabilities,
        )

    return ModelRecommendation(
        recommended_model_id="google/gemini-2.5-flash-image",
        reason="Best cost-to-quality ratio — fast and cost-effective",
        capabilities=capabilities,
    )


# --- Fallback model suggestions (Phase 5, Section 10.6) ---

FALLBACK_MAP: dict[str, list[str]] = {
    "google/gemini-3-pro-image-preview": [
        "google/gemini-2.5-flash-image",
        "openai/gpt-5-image",
    ],
    "openai/gpt-5-image": [
        "google/gemini-3-pro-image-preview",
    ],
    "google/gemini-2.5-flash-image": [
        "google/gemini-3-pro-image-preview",
        "openai/gpt-5-image",
    ],
    "black-forest-labs/flux.2-max": [
        "bytedance-seed/seedream-4.5",
    ],
    "bytedance-seed/seedream-4.5": [
        "black-forest-labs/flux.2-max",
    ],
}


def get_fallback_suggestion(unavailable_model_id: str) -> FallbackSuggestion | None:
    """Suggest an alternative model when the selected one is unavailable.

    Returns None if no fallback is available.
    """
    candidates = FALLBACK_MAP.get(unavailable_model_id, [])
    if not candidates:
        return None

    suggested_id = candidates[0]
    suggested_model = MODELS.get(suggested_id)
    if not suggested_model:
        return None

    return FallbackSuggestion(
        unavailable_model_id=unavailable_model_id,
        suggested_model_id=suggested_id,
        suggested_model_name=suggested_model["name"],
        reason=f"{MODELS[unavailable_model_id]['name']} is temporarily unavailable. "
               f"{suggested_model['name']} offers similar capabilities.",
    )
