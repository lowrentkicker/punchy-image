"""Image processing: save, thumbnail generation, export, reference image prep."""

import base64
import io
import uuid
from pathlib import Path

from PIL import Image

# Enforce decompression bomb limit (Pillow default is a warning; we make it an error)
Image.MAX_IMAGE_PIXELS = 178_956_970

MAX_DIMENSION = 4096
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB

EXPORT_MIME_TYPES = {
    "png": "image/png",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}


def _strip_metadata(img: Image.Image) -> Image.Image:
    """Return a copy of the image with all metadata stripped."""
    clean = img.copy()
    clean.info = {}
    return clean


def save_image(image_data: bytes, filepath: Path) -> None:
    """Save raw image bytes as a clean PNG with no metadata."""
    img = Image.open(io.BytesIO(image_data))
    try:
        img.load()
        clean = _strip_metadata(img)
        clean.save(filepath, "PNG")
        clean.close()
    finally:
        img.close()


def generate_thumbnail(
    source_path: Path,
    thumbnail_path: Path,
    max_size: int = 256,
) -> None:
    """Generate a thumbnail with the longest side equal to max_size."""
    img = Image.open(source_path)
    try:
        img.load()
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        clean = _strip_metadata(img)
        clean.save(thumbnail_path, "PNG")
        clean.close()
    finally:
        img.close()


def save_generation_result(
    image_data: bytes,
    images_dir: Path,
    thumbnails_dir: Path,
) -> tuple[str, str, str]:
    """Save generated image and thumbnail, return (image_id, image_filename, thumbnail_filename)."""
    image_id = str(uuid.uuid4())
    image_filename = f"{image_id}.png"
    thumbnail_filename = f"{image_id}_thumb.png"

    image_path = images_dir / image_filename
    thumbnail_path = thumbnails_dir / thumbnail_filename

    save_image(image_data, image_path)
    generate_thumbnail(image_path, thumbnail_path)

    return image_id, image_filename, thumbnail_filename


def prepare_for_export(
    source_path: Path,
    fmt: str = "png",
    quality: int = 90,
    dpi: int | None = None,
) -> bytes:
    """Read an image and return clean bytes in the specified format.

    Metadata is stripped except for DPI when explicitly provided.

    Args:
        source_path: Path to the source image file.
        fmt: Output format — "png", "jpeg", or "webp".
        quality: Quality for JPEG/WebP (1-100). Ignored for PNG.
        dpi: Resolution in dots per inch. When set, embeds DPI metadata for print workflows.
    """
    img = Image.open(source_path)
    try:
        img.load()

        # For JPEG, convert RGBA to RGB
        if fmt == "jpeg" and img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img.close()
            img = bg

        clean = _strip_metadata(img)

        save_kwargs: dict[str, object] = {}
        if dpi is not None:
            save_kwargs["dpi"] = (dpi, dpi)

        buf = io.BytesIO()
        if fmt == "png":
            clean.save(buf, "PNG", **save_kwargs)
        elif fmt == "jpeg":
            clean.save(buf, "JPEG", quality=quality, **save_kwargs)
        elif fmt == "webp":
            clean.save(buf, "WEBP", quality=quality, **save_kwargs)
        else:
            clean.save(buf, "PNG", **save_kwargs)

        clean.close()
        return buf.getvalue()
    finally:
        img.close()


def validate_and_process_upload(image_data: bytes) -> tuple[bytes, bool]:
    """Validate and process an uploaded reference image.

    Returns (processed_bytes, was_resized).
    Raises ValueError if the image is invalid or too large.
    """
    if len(image_data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"Image exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit")

    try:
        img = Image.open(io.BytesIO(image_data))
        img.load()
    except Exception:
        raise ValueError("Invalid image file")

    try:
        was_resized = False
        w, h = img.size
        longest = max(w, h)

        if longest > MAX_DIMENSION:
            ratio = MAX_DIMENSION / longest
            new_w = int(w * ratio)
            new_h = int(h * ratio)
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            img.close()
            img = resized
            was_resized = True

        # Convert to RGB if needed (handles RGBA, P, etc.)
        if img.mode not in ("RGB", "RGBA"):
            converted = img.convert("RGB")
            img.close()
            img = converted

        # Re-encode as JPEG for efficient base64 transfer
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=90)
        return buf.getvalue(), was_resized
    finally:
        img.close()


def compress_for_size_limit(image_data: bytes, max_base64_bytes: int) -> bytes:
    """Iteratively compress an image until its base64 representation fits within max_base64_bytes.

    Starts at quality 85 and steps down. Also resizes if quality alone isn't enough.
    Returns JPEG bytes. Raises ValueError if it can't fit within the limit.
    """
    img = Image.open(io.BytesIO(image_data))
    try:
        img.load()
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img.close()
            img = bg
        elif img.mode not in ("RGB",):
            converted = img.convert("RGB")
            img.close()
            img = converted

        for quality in (85, 70, 55, 40):
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=quality)
            raw = buf.getvalue()
            # base64 inflates by ~4/3
            if len(raw) * 4 // 3 <= max_base64_bytes:
                return raw

        # If quality reduction alone isn't enough, also downscale
        for scale in (0.75, 0.5):
            scaled = img.resize(
                (int(img.width * scale), int(img.height * scale)),
                Image.Resampling.LANCZOS,
            )
            buf = io.BytesIO()
            scaled.save(buf, "JPEG", quality=40)
            scaled.close()
            raw = buf.getvalue()
            if len(raw) * 4 // 3 <= max_base64_bytes:
                return raw

        raise ValueError("Image too large even after aggressive compression")
    finally:
        img.close()


def image_to_base64_url(image_data: bytes, mime_type: str = "image/jpeg") -> str:
    """Encode image bytes as a data URL for the OpenRouter API."""
    b64 = base64.b64encode(image_data).decode("ascii")
    return f"data:{mime_type};base64,{b64}"
