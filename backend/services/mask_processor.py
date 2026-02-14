"""Mask processing for region editing.

Handles mask-to-prompt translation for conversational models and
mask compositing for image-only models.
"""

import base64
import io

from PIL import Image

from backend.config import is_conversational


def decode_mask(mask_base64: str) -> Image.Image:
    """Decode a base64-encoded mask PNG to a PIL Image."""
    if "," in mask_base64:
        mask_base64 = mask_base64.split(",", 1)[1]
    raw = base64.b64decode(mask_base64)
    return Image.open(io.BytesIO(raw)).convert("L")


def describe_mask_region(mask: Image.Image) -> str:
    """Generate a natural language description of the masked region's position.

    Divides the image into a 3x3 grid and describes which cells are covered.
    """
    w, h = mask.size
    third_w, third_h = w // 3, h // 3

    regions: list[str] = []
    region_names = [
        ["top-left", "top-center", "top-right"],
        ["center-left", "center", "center-right"],
        ["bottom-left", "bottom-center", "bottom-right"],
    ]

    for row in range(3):
        for col in range(3):
            x1 = col * third_w
            y1 = row * third_h
            x2 = min(x1 + third_w, w)
            y2 = min(y1 + third_h, h)
            region_crop = mask.crop((x1, y1, x2, y2))
            # Count white pixels (mask area) vs total
            pixels = list(region_crop.getdata())
            white_count = sum(1 for p in pixels if p > 128)
            total = len(pixels)
            if total > 0 and white_count / total > 0.15:
                regions.append(region_names[row][col])

    if not regions:
        return "a small area"
    if len(regions) >= 7:
        return "most of the image"
    return "the " + ", ".join(regions) + " area" + ("s" if len(regions) > 1 else "")


def build_mask_prompt(
    prompt: str,
    mask: Image.Image,
    model_id: str,
    mask_description: str | None = None,
) -> str:
    """Build a prompt that describes the mask edit for the model.

    For conversational models: uses natural language region description.
    For image-only models: uses simpler instructions (the mask is composited onto the image).
    """
    region_desc = mask_description or describe_mask_region(mask)

    if is_conversational(model_id):
        return (
            f"Edit only {region_desc} of the image. "
            f"In that region: {prompt}. "
            f"Keep all other areas exactly as they are — do not modify anything outside the specified region."
        )
    else:
        return (
            f"The marked/blank region in the image needs to be filled. "
            f"Fill the blank area with: {prompt}. "
            f"Seamlessly blend the filled content with the surrounding image. "
            f"Do not modify any area that already has content."
        )


def composite_mask_on_image(
    source_path: str,
    mask: Image.Image,
    fill_color: tuple[int, int, int] = (128, 128, 128),
) -> bytes:
    """Composite the mask onto the source image for image-only models.

    Fills the masked region with a neutral color so the model knows what to regenerate.
    Returns the composited image as PNG bytes.
    """
    source = Image.open(source_path).convert("RGB")

    # Resize mask to match source if needed
    if mask.size != source.size:
        mask = mask.resize(source.size, Image.LANCZOS)

    # Create fill layer
    fill = Image.new("RGB", source.size, fill_color)

    # Composite: where mask is white, use fill; where black, keep original
    composite = Image.composite(fill, source, mask)

    buf = io.BytesIO()
    composite.save(buf, format="PNG")
    return buf.getvalue()


def image_to_base64_data_url(image_bytes: bytes) -> str:
    """Convert image bytes to a data URL."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64}"
