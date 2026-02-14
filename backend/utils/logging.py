"""Error logging with API key redaction."""

import logging
import traceback
from logging.handlers import RotatingFileHandler
from pathlib import Path

IMAGEGEN_DIR = Path.home() / ".imagegen"

_logger: logging.Logger | None = None


def setup_logger() -> logging.Logger:
    """Create and configure the application logger."""
    global _logger
    if _logger is not None:
        return _logger

    _logger = logging.getLogger("imagegen")
    _logger.setLevel(logging.DEBUG)

    log_path = IMAGEGEN_DIR / "error.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    handler = RotatingFileHandler(
        log_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )
    _logger.addHandler(handler)
    return _logger


def redact_api_key(message: str, api_key: str | None) -> str:
    """Replace any occurrence of the API key with [REDACTED]."""
    if not api_key:
        return message
    return message.replace(api_key, "[REDACTED]")


def log_error(message: str, exc: Exception | None = None) -> None:
    """Log an error with API key redacted."""
    from backend.config import get_api_key

    logger = setup_logger()
    api_key = get_api_key()
    safe_message = redact_api_key(message, api_key)

    if exc:
        tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
        safe_tb = redact_api_key("".join(tb), api_key)
        logger.error(f"{safe_message}\n{safe_tb}")
    else:
        logger.error(safe_message)
