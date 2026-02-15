"""Standardized API error handling utilities."""

from fastapi import HTTPException

from backend.services.openrouter import OpenRouterError
from backend.utils.logging import log_error


def openrouter_error_to_http(error: OpenRouterError, context: str = "") -> HTTPException:
    """Convert an OpenRouterError to an HTTPException with a structured detail body."""
    if context:
        log_error(f"{context}: {error.error_type} - {error.message}")
    return HTTPException(
        status_code=422,
        detail={
            "error_type": error.error_type,
            "message": error.message,
            "retry_after": error.retry_after,
        },
    )


def unexpected_error_to_http(exc: Exception, context: str = "") -> HTTPException:
    """Convert an unexpected exception to a generic 500 HTTPException."""
    log_error(f"Unexpected {context} error: {exc}", exc)
    return HTTPException(
        status_code=500,
        detail={
            "error_type": "server",
            "message": "An unexpected error occurred.",
        },
    )
