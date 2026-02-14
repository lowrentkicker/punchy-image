"""Per-model cost estimation based on OpenRouter pricing, with spend logging."""

import csv
from datetime import datetime, timezone

from backend.config import MODELS
from backend.utils.storage import get_spend_log_path

# Resolution multipliers (relative to 1K base cost)
RESOLUTION_MULTIPLIERS: dict[str, float] = {
    "1K": 1.0,
    "2K": 2.0,
    "4K": 4.0,
}

# Pricing structure per model (from PRD Appendix B)
# For token-based models, estimated_cost_1k is the approximate cost per 1K image
# For megapixel models, cost scales with resolution
# For flat-rate models, cost is fixed regardless of resolution
PRICING_TYPE: dict[str, str] = {
    "google/gemini-2.5-flash-image": "token",
    "google/gemini-3-pro-image-preview": "token",
    "openai/gpt-5-image": "token",
    "black-forest-labs/flux.2-max": "megapixel",
    "bytedance-seed/seedream-4.5": "flat",
}


def estimate_cost(
    model_id: str,
    resolution: str = "1K",
    variations: int = 1,
) -> dict:
    """Estimate the cost of a generation request.

    Returns dict with:
        estimated_cost: float (in USD)
        is_approximate: bool (True for token-based models)
        pricing_type: str
    """
    model = MODELS.get(model_id)
    if not model:
        return {"estimated_cost": 0.0, "is_approximate": True, "pricing_type": "unknown"}

    base_cost = model.get("estimated_cost_1k")
    pricing_type = PRICING_TYPE.get(model_id, "token")
    multiplier = RESOLUTION_MULTIPLIERS.get(resolution, 1.0)

    if base_cost is None:
        # Price not yet known — return approximate estimate
        return {
            "estimated_cost": 0.05 * multiplier * variations,
            "is_approximate": True,
            "pricing_type": pricing_type,
        }

    if pricing_type == "flat":
        # Seedream: flat rate regardless of resolution
        cost = base_cost * variations
        return {"estimated_cost": cost, "is_approximate": False, "pricing_type": pricing_type}
    elif pricing_type == "megapixel":
        # Flux: scales with resolution (megapixels)
        cost = base_cost * multiplier * variations
        return {"estimated_cost": cost, "is_approximate": False, "pricing_type": pricing_type}
    else:
        # Token-based: approximate, scales with resolution
        cost = base_cost * multiplier * variations
        return {"estimated_cost": cost, "is_approximate": True, "pricing_type": pricing_type}


# --- Session spend tracking ---
_session_total: float = 0.0

CSV_HEADERS = ["date", "model_id", "model_name", "resolution", "variations", "estimated_cost"]


def log_spend(
    model_id: str,
    resolution: str = "1K",
    variations: int = 1,
) -> float:
    """Estimate cost and append to spend log CSV. Returns the estimated cost."""
    global _session_total
    result = estimate_cost(model_id, resolution, variations)
    cost = result["estimated_cost"]
    _session_total += cost

    model = MODELS.get(model_id, {})
    model_name = model.get("name", model_id)
    now = datetime.now(timezone.utc).isoformat()

    log_path = get_spend_log_path()
    write_header = not log_path.exists() or log_path.stat().st_size == 0

    with open(log_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADERS)
        writer.writerow([now, model_id, model_name, resolution, variations, f"{cost:.6f}"])

    return cost


def get_session_total() -> float:
    """Return cumulative spend for the current session."""
    return _session_total


def get_all_time_total() -> float:
    """Sum all estimated costs from the spend log CSV."""
    log_path = get_spend_log_path()
    if not log_path.exists():
        return 0.0
    total = 0.0
    with open(log_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                total += float(row.get("estimated_cost", 0))
            except (ValueError, TypeError):
                pass
    return total


def get_recent_entries(limit: int = 50) -> list[dict]:
    """Read the most recent spend log entries."""
    log_path = get_spend_log_path()
    if not log_path.exists():
        return []
    entries: list[dict] = []
    with open(log_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            entries.append({
                "date": row.get("date", ""),
                "model_id": row.get("model_id", ""),
                "model_name": row.get("model_name", ""),
                "resolution": row.get("resolution", "1K"),
                "variations": int(row.get("variations", 1)),
                "estimated_cost": float(row.get("estimated_cost", 0)),
            })
    return entries[-limit:]
