"""Prompt template endpoints: built-in and user templates."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from backend.models.project import (
    CreateTemplateRequest,
    PromptTemplate,
    TemplateListResponse,
    UpdateTemplateRequest,
)
from backend.utils.storage import atomic_write_json, get_templates_dir, read_json

router = APIRouter(tags=["templates"])

# Built-in templates per PRD Section 10.2
BUILTIN_TEMPLATES: list[dict] = [
    {
        "id": "builtin-product-white",
        "name": "Product on White Background",
        "category": "Product Photography",
        "prompt_text": "[Product description] on a clean white background, professional product photography, studio lighting, high detail",
        "is_builtin": True,
    },
    {
        "id": "builtin-product-lifestyle",
        "name": "Lifestyle Product Shot",
        "category": "Product Photography",
        "prompt_text": "[Product description] in a lifestyle setting, natural lighting, warm tones, editorial style product photography",
        "is_builtin": True,
    },
    {
        "id": "builtin-product-packaging",
        "name": "Packaging Mockup",
        "category": "Product Photography",
        "prompt_text": "[Product/brand name] packaging mockup, photorealistic, clean design, professional presentation",
        "is_builtin": True,
    },
    {
        "id": "builtin-product-flatlay",
        "name": "Flat Lay",
        "category": "Product Photography",
        "prompt_text": "Flat lay arrangement of [items], overhead view, styled composition, clean background",
        "is_builtin": True,
    },
    {
        "id": "builtin-portrait-headshot",
        "name": "Professional Headshot",
        "category": "Portraits",
        "prompt_text": "Professional headshot of [subject description], studio lighting, neutral background, sharp focus, business portrait",
        "is_builtin": True,
    },
    {
        "id": "builtin-portrait-environmental",
        "name": "Environmental Portrait",
        "category": "Portraits",
        "prompt_text": "Environmental portrait of [subject description] in [setting], natural lighting, candid feel, storytelling composition",
        "is_builtin": True,
    },
    {
        "id": "builtin-social-post",
        "name": "Social Media Post",
        "category": "Marketing / Social",
        "prompt_text": "[Subject/theme] for social media, vibrant colors, eye-catching composition, modern aesthetic, square format",
        "is_builtin": True,
    },
    {
        "id": "builtin-social-banner",
        "name": "Banner / Hero Image",
        "category": "Marketing / Social",
        "prompt_text": "[Subject/theme] hero banner image, wide format, impactful composition, bold visual, space for text overlay",
        "is_builtin": True,
    },
    {
        "id": "builtin-scene-interior",
        "name": "Interior Design",
        "category": "Scenes / Environments",
        "prompt_text": "Interior design of [room type], [style] aesthetic, natural lighting through windows, detailed furnishings, architectural photography",
        "is_builtin": True,
    },
    {
        "id": "builtin-scene-landscape",
        "name": "Landscape",
        "category": "Scenes / Environments",
        "prompt_text": "[Landscape description], golden hour lighting, vast composition, vivid colors, high detail landscape photography",
        "is_builtin": True,
    },
]


def _get_user_templates_path():
    templates_dir = get_templates_dir()
    templates_dir.mkdir(parents=True, exist_ok=True)
    return templates_dir / "user.json"


def _load_user_templates() -> list[dict]:
    path = _get_user_templates_path()
    data = read_json(path)
    if not isinstance(data, list):
        return []
    return data


def _save_user_templates(templates: list[dict]) -> None:
    atomic_write_json(_get_user_templates_path(), templates)


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates() -> TemplateListResponse:
    builtin = [PromptTemplate(**t) for t in BUILTIN_TEMPLATES]
    user_data = _load_user_templates()
    user = [PromptTemplate(**t) for t in user_data]
    return TemplateListResponse(builtin=builtin, user=user)


@router.post("/templates", response_model=PromptTemplate)
async def create_template(request: CreateTemplateRequest) -> PromptTemplate:
    template_id = f"user-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    template = PromptTemplate(
        id=template_id,
        name=request.name.strip(),
        category=request.category.strip(),
        prompt_text=request.prompt_text,
        is_builtin=False,
        tags=request.tags,
        created_at=now,
    )

    templates = _load_user_templates()
    templates.append(template.model_dump())
    _save_user_templates(templates)

    return template


@router.put("/templates/{template_id}", response_model=PromptTemplate)
async def update_template(template_id: str, request: UpdateTemplateRequest) -> PromptTemplate:
    if template_id.startswith("builtin-"):
        raise HTTPException(status_code=400, detail="Cannot edit built-in templates")

    templates = _load_user_templates()
    for i, t in enumerate(templates):
        if t.get("id") == template_id:
            if request.name is not None:
                t["name"] = request.name.strip()
            if request.category is not None:
                t["category"] = request.category.strip()
            if request.prompt_text is not None:
                t["prompt_text"] = request.prompt_text
            if request.tags is not None:
                t["tags"] = request.tags
            templates[i] = t
            _save_user_templates(templates)
            return PromptTemplate(**t)

    raise HTTPException(status_code=404, detail="Template not found")


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str) -> dict:
    if template_id.startswith("builtin-"):
        raise HTTPException(status_code=400, detail="Cannot delete built-in templates")

    templates = _load_user_templates()
    updated = [t for t in templates if t.get("id") != template_id]
    if len(updated) == len(templates):
        raise HTTPException(status_code=404, detail="Template not found")

    _save_user_templates(updated)
    return {"deleted": True}
