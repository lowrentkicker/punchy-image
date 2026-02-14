"""Pydantic schemas for projects, templates, cost tracking, and storage."""

from pydantic import BaseModel


# --- Projects ---

class ProjectInfo(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class CreateProjectRequest(BaseModel):
    name: str


class RenameProjectRequest(BaseModel):
    new_name: str


class ProjectListResponse(BaseModel):
    projects: list[ProjectInfo]
    current_project_id: str


class ProjectSettings(BaseModel):
    preferred_model_id: str | None = None
    preferred_resolution: str | None = None
    preferred_aspect_ratio: str | None = None
    preferred_style_preset: str | None = None


# --- Templates ---

class PromptTemplate(BaseModel):
    id: str
    name: str
    category: str
    prompt_text: str
    is_builtin: bool = False
    tags: list[str] = []
    created_at: str | None = None


class CreateTemplateRequest(BaseModel):
    name: str
    category: str
    prompt_text: str
    tags: list[str] = []


class UpdateTemplateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    prompt_text: str | None = None
    tags: list[str] | None = None


class TemplateListResponse(BaseModel):
    builtin: list[PromptTemplate]
    user: list[PromptTemplate]


# --- Cost Tracking ---

class SpendLogEntry(BaseModel):
    date: str
    model_id: str
    model_name: str
    resolution: str
    variations: int
    estimated_cost: float


class CostTrackingResponse(BaseModel):
    session_total: float
    all_time_total: float
    spend_limit: float | None = None
    recent_entries: list[SpendLogEntry]
    disclaimer: str = "Estimates are based on published OpenRouter pricing. Actual charges may vary."


class SetSpendLimitRequest(BaseModel):
    limit: float | None = None


# --- Storage ---

class ProjectStorageUsage(BaseModel):
    project_id: str
    project_name: str
    bytes_used: int


class StorageUsageResponse(BaseModel):
    total_bytes: int
    quota_bytes: int
    percentage: float
    by_project: list[ProjectStorageUsage]


class SetQuotaRequest(BaseModel):
    quota_bytes: int


# --- Connectivity ---

class ConnectivityStatusResponse(BaseModel):
    online: bool
    last_checked: str


# --- Fallback ---

class FallbackSuggestion(BaseModel):
    unavailable_model_id: str
    suggested_model_id: str
    suggested_model_name: str
    reason: str
