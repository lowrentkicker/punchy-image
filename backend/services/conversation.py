"""Multi-turn conversation state management with branching and persistence."""

import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.config import MODELS, is_conversational
from backend.models.conversation import (
    ConversationBranch,
    ConversationSession,
    ConversationSessionSummary,
    ConversationTurn,
)
from backend.utils.storage import atomic_write_json, get_project_dir, read_json

# Rough token estimate: 4 chars per token (conservative)
CHARS_PER_TOKEN = 4
# Warn at 80% of estimated context limit
CONTEXT_WARN_RATIO = 0.8
# Conservative context limits per model family
MODEL_CONTEXT_LIMITS: dict[str, int] = {
    "google/gemini-2.5-flash-image": 128_000,
    "google/gemini-3-pro-image-preview": 128_000,
    "openai/gpt-5-image": 128_000,
}


def _get_conversations_dir(project: str = "default") -> Path:
    d = get_project_dir(project) / "conversations"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _session_path(session_id: str, project: str = "default") -> Path:
    return _get_conversations_dir(project) / f"{session_id}.json"


def create_session(model_id: str, project: str = "default") -> ConversationSession:
    """Create a new conversation session."""
    now = datetime.now(timezone.utc).isoformat()
    session = ConversationSession(
        session_id=str(uuid.uuid4()),
        project=project,
        model_id=model_id,
        created_at=now,
        updated_at=now,
        branches=[
            ConversationBranch(branch_id="main", name="main", turns=[])
        ],
        active_branch_id="main",
    )
    save_session(session)
    return session


def save_session(session: ConversationSession) -> None:
    """Persist session to disk."""
    session.updated_at = datetime.now(timezone.utc).isoformat()
    path = _session_path(session.session_id, session.project)
    atomic_write_json(path, session.model_dump())


def load_session(session_id: str, project: str = "default") -> ConversationSession | None:
    """Load a session from disk."""
    path = _session_path(session_id, project)
    data = read_json(path)
    if not data or not isinstance(data, dict):
        return None
    return ConversationSession(**data)


def list_sessions(project: str = "default") -> list[ConversationSessionSummary]:
    """List all conversation sessions as summaries."""
    conv_dir = _get_conversations_dir(project)
    summaries = []
    for path in sorted(conv_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        data = read_json(path)
        if not data or not isinstance(data, dict):
            continue
        session = ConversationSession(**data)
        active_branch = get_active_branch(session)
        turn_count = len(active_branch.turns) if active_branch else 0
        last_image = None
        if active_branch and active_branch.turns:
            for t in reversed(active_branch.turns):
                if t.image_url:
                    last_image = t.image_url
                    break
        summaries.append(ConversationSessionSummary(
            session_id=session.session_id,
            model_id=session.model_id,
            created_at=session.created_at,
            updated_at=session.updated_at,
            turn_count=turn_count,
            branch_count=len(session.branches),
            last_image_url=last_image,
        ))
    return summaries


def delete_session(session_id: str, project: str = "default") -> bool:
    """Delete a session from disk."""
    path = _session_path(session_id, project)
    if path.exists():
        path.unlink()
        return True
    return False


def get_active_branch(session: ConversationSession) -> ConversationBranch | None:
    """Get the currently active branch."""
    for branch in session.branches:
        if branch.branch_id == session.active_branch_id:
            return branch
    return None


def add_turn(
    session: ConversationSession,
    prompt: str | None,
    image_id: str | None = None,
    image_url: str | None = None,
    thumbnail_url: str | None = None,
    text_response: str | None = None,
    usage: dict | None = None,
    role: str = "assistant",
) -> ConversationTurn:
    """Add a turn to the active branch and save."""
    branch = get_active_branch(session)
    if not branch:
        raise ValueError("No active branch")

    turn = ConversationTurn(
        turn_id=str(uuid.uuid4()),
        role=role,
        prompt=prompt,
        image_id=image_id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        text_response=text_response,
        timestamp=datetime.now(timezone.utc).isoformat(),
        usage=usage,
    )
    branch.turns.append(turn)
    save_session(session)
    return turn


def undo_turn(session: ConversationSession) -> bool:
    """Remove the most recent turn from the active branch."""
    branch = get_active_branch(session)
    if not branch or not branch.turns:
        return False
    branch.turns.pop()
    save_session(session)
    return True


def revert_to_turn(session: ConversationSession, turn_index: int) -> bool:
    """Revert to a specific turn, removing all subsequent turns."""
    branch = get_active_branch(session)
    if not branch or turn_index < 0 or turn_index >= len(branch.turns):
        return False
    branch.turns = branch.turns[: turn_index + 1]
    save_session(session)
    return True


def branch_from_turn(session: ConversationSession, turn_index: int) -> ConversationBranch:
    """Create a new branch forking from a specific turn in the active branch."""
    active_branch = get_active_branch(session)
    if not active_branch or turn_index < 0 or turn_index >= len(active_branch.turns):
        raise ValueError("Invalid turn index for branching")

    branch_num = len(session.branches)
    new_branch = ConversationBranch(
        branch_id=str(uuid.uuid4()),
        name=f"branch-{branch_num}",
        parent_branch_id=active_branch.branch_id,
        fork_turn_index=turn_index,
        turns=list(active_branch.turns[: turn_index + 1]),
    )
    session.branches.append(new_branch)
    session.active_branch_id = new_branch.branch_id
    save_session(session)
    return new_branch


def switch_branch(session: ConversationSession, branch_id: str) -> bool:
    """Switch the active branch."""
    for branch in session.branches:
        if branch.branch_id == branch_id:
            session.active_branch_id = branch_id
            save_session(session)
            return True
    return False


def build_conversation_messages(session: ConversationSession) -> list[dict]:
    """Build the OpenRouter messages array from conversation history.

    Returns list of message dicts suitable for the OpenRouter API.
    """
    branch = get_active_branch(session)
    if not branch:
        return []

    messages: list[dict] = []
    for turn in branch.turns:
        if turn.role == "user" and turn.prompt:
            content: list[dict] = [{"type": "text", "text": turn.prompt}]
            messages.append({"role": "user", "content": content})
        elif turn.role == "assistant":
            # Include text response if present
            assistant_content = turn.text_response or ""
            messages.append({"role": "assistant", "content": assistant_content})

    return messages


def estimate_token_usage(session: ConversationSession) -> dict:
    """Estimate token usage for the conversation.

    Returns dict with estimated_tokens, context_limit, usage_ratio, near_limit.
    """
    branch = get_active_branch(session)
    if not branch:
        return {"estimated_tokens": 0, "context_limit": 0, "usage_ratio": 0.0, "near_limit": False}

    total_chars = 0
    for turn in branch.turns:
        if turn.prompt:
            total_chars += len(turn.prompt)
        if turn.text_response:
            total_chars += len(turn.text_response)

    estimated_tokens = total_chars // CHARS_PER_TOKEN
    context_limit = MODEL_CONTEXT_LIMITS.get(session.model_id, 128_000)
    usage_ratio = estimated_tokens / context_limit if context_limit > 0 else 0.0

    return {
        "estimated_tokens": estimated_tokens,
        "context_limit": context_limit,
        "usage_ratio": round(usage_ratio, 3),
        "near_limit": usage_ratio >= CONTEXT_WARN_RATIO,
    }


def set_subject_lock(
    session: ConversationSession,
    locked: bool,
    image_id: str | None = None,
) -> None:
    """Set or clear the subject lock for a session."""
    session.subject_locked = locked
    session.subject_lock_image_id = image_id if locked else None
    save_session(session)
