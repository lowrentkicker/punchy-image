"""Prompt assembly from user input and optional modifiers.

Assembly order (per CLAUDE.md):
1. Subject-consistency instructions (if character reference images present)
2. Style reference instructions (if style reference image uploaded)
3. User's prompt (unmodified)
4. Style preset suffix (if preset other than "None" selected)
5. Negative prompt / exclusion instructions (if negative prompt provided)
6. Image weight adjustment (modifies reference image instruction framing)
"""

from backend.config import is_conversational

STYLE_PRESETS: dict[str, str] = {
    "none": "",
    "photorealistic": "Photorealistic, shot on a professional DSLR camera, natural lighting, sharp focus, high detail",
    "cinematic": "Cinematic still, dramatic lighting, shallow depth of field, film grain, anamorphic lens",
    "anime": "Anime style, cel-shaded, vibrant colors, clean linework",
    "watercolor": "Watercolor painting, soft edges, visible brush strokes, pigment bleeding",
    "oil_painting": "Oil painting, textured canvas, visible impasto brushwork, rich color depth",
    "line_art": "Clean line art, black ink on white paper, precise linework, no shading",
    "flat_illustration": "Flat vector illustration, bold colors, clean shapes, minimal shading",
    "isometric": "Isometric 3D illustration, clean geometry, consistent lighting, technical precision",
    "pixel_art": "Pixel art, retro gaming aesthetic, limited color palette, crisp pixels",
    "3d_render": "3D render, physically-based rendering, studio lighting, smooth surfaces",
    "product_photography": "Professional product photography, white background, studio lighting, commercial quality",
}

STYLE_DISPLAY_NAMES: dict[str, str] = {
    "none": "None",
    "photorealistic": "Photorealistic",
    "cinematic": "Cinematic",
    "anime": "Anime / Manga",
    "watercolor": "Watercolor",
    "oil_painting": "Oil Painting",
    "line_art": "Line Art / Sketch",
    "flat_illustration": "Flat Illustration",
    "isometric": "Isometric",
    "pixel_art": "Pixel Art",
    "3d_render": "3D Render",
    "product_photography": "Product Photography",
}

# Default image weight mappings — these translate the 0-100 slider into prompt framing.
# Stored here as defaults; can be overridden via ~/.imagegen/image_weight_mappings.json
DEFAULT_IMAGE_WEIGHT_MAPPINGS: dict[str, dict[str, str]] = {
    # Ranges: low (0-25), medium-low (26-40), medium (41-60), medium-high (61-75), high (76-100)
    "low": {
        "conversational": "Use the reference image only as loose inspiration. Focus primarily on the text prompt. The reference is a general mood guide, not a strict template.",
        "image_only": "Loosely reference the provided image. Prioritize the text prompt over visual similarity to the reference.",
    },
    "medium_low": {
        "conversational": "Take moderate inspiration from the reference image while following the text prompt closely. Borrow general composition and color mood from the reference.",
        "image_only": "Moderately reference the provided image. Follow the text prompt but incorporate the reference's general composition.",
    },
    "medium": {
        "conversational": "Balance the reference image and the text prompt equally. Maintain the reference's overall composition and style while incorporating the prompted changes.",
        "image_only": "Balance the reference image and text prompt. Maintain similar composition and visual elements from the reference.",
    },
    "medium_high": {
        "conversational": "Closely follow the reference image. Make only the changes described in the text prompt. Preserve most visual elements, colors, and composition from the reference.",
        "image_only": "Closely follow the reference image. Preserve most visual elements and composition. Apply only the changes described in the prompt.",
    },
    "high": {
        "conversational": "Reproduce the reference image as closely as possible, applying only minimal changes as described in the text prompt. Preserve details, colors, lighting, composition, and style from the reference.",
        "image_only": "Reproduce the reference image as closely as possible with only the prompted modifications. Maintain all visual details from the reference.",
    },
}


def _get_weight_bracket(weight: int) -> str:
    """Map 0-100 slider value to a weight bracket name."""
    if weight <= 25:
        return "low"
    elif weight <= 40:
        return "medium_low"
    elif weight <= 60:
        return "medium"
    elif weight <= 75:
        return "medium_high"
    else:
        return "high"


def _build_image_weight_instruction(weight: int, model_id: str | None) -> str:
    """Build an image weight instruction string from the slider value."""
    bracket = _get_weight_bracket(weight)
    model_type = "conversational" if (model_id and is_conversational(model_id)) else "image_only"
    mapping = DEFAULT_IMAGE_WEIGHT_MAPPINGS.get(bracket, DEFAULT_IMAGE_WEIGHT_MAPPINGS["medium"])
    return mapping[model_type]


def build_prompt(
    user_prompt: str,
    style_preset: str | None = None,
    negative_prompt: str | None = None,
    model_id: str | None = None,
    has_character_refs: bool = False,
    has_style_ref: bool = False,
    image_weight: int | None = None,
) -> str:
    """Build the final prompt from user input and modifiers.

    The user's prompt is always included unmodified. Other components
    are assembled around it in the documented order.
    """
    parts: list[str] = []

    # 1. Subject-consistency instructions (if character reference images present)
    if has_character_refs:
        parts.append(
            "Use the provided reference image(s) to maintain consistent appearance "
            "for the subject. Preserve facial features, body proportions, clothing "
            "details, and distinguishing characteristics"
        )

    # 2. Style reference instructions (if style reference image uploaded)
    if has_style_ref:
        parts.append(
            "Adopt the visual style, color palette, lighting, and artistic technique "
            "of the provided style reference image. Do not replicate the subject matter "
            "of the reference"
        )

    # 3. User's prompt (unmodified)
    parts.append(user_prompt.strip())

    # 4. Style preset suffix
    if style_preset and style_preset != "none":
        suffix = STYLE_PRESETS.get(style_preset, "")
        if suffix:
            parts.append(suffix)

    # 5. Negative prompt / exclusion instructions
    if negative_prompt and negative_prompt.strip():
        neg = negative_prompt.strip()
        if model_id and is_conversational(model_id):
            parts.append(f"Do NOT include the following in the generated image: {neg}")
        else:
            parts.append(f"Avoid: {neg}")

    # 6. Image weight adjustment (modifies reference image instruction framing)
    if image_weight is not None and (has_character_refs or has_style_ref):
        weight_instruction = _build_image_weight_instruction(image_weight, model_id)
        parts.append(weight_instruction)

    return ". ".join(parts)
