"""Logging configuration and utilities."""

import logging
import uuid
from typing import Optional
from contextvars import ContextVar

from app.config import settings

# Context variable for request ID
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)


class RequestIDFilter(logging.Filter):
    """Logging filter to add request ID to log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or "no-request-id"
        return True


def setup_logging() -> None:
    """Setup application logging."""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Add request ID filter to all loggers
    for handler in logging.root.handlers:
        handler.addFilter(RequestIDFilter())


def get_request_id() -> str:
    """Get current request ID or generate new one."""
    request_id = request_id_var.get()
    if not request_id:
        request_id = str(uuid.uuid4())
        request_id_var.set(request_id)
    return request_id


def set_request_id(request_id: str) -> None:
    """Set request ID in context."""
    request_id_var.set(request_id)


def get_logger(name: str) -> logging.Logger:
    """Get logger with specified name."""
    return logging.getLogger(name)
