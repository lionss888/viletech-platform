"""Structured logging configuration for VILI application"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path

from app.core.config import settings


# ============================================
# JSON Formatter for Structured Logging
# ============================================

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def __init__(
        self,
        include_timestamp: bool = True,
        include_level: bool = True,
        include_logger: bool = True,
        include_path: bool = False,
    ):
        super().__init__()
        self.include_timestamp = include_timestamp
        self.include_level = include_level
        self.include_logger = include_logger
        self.include_path = include_path
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {}
        
        if self.include_timestamp:
            log_data["timestamp"] = datetime.utcnow().isoformat() + "Z"
        
        if self.include_level:
            log_data["level"] = record.levelname
        
        if self.include_logger:
            log_data["logger"] = record.name
        
        if self.include_path:
            log_data["path"] = f"{record.pathname}:{record.lineno}"
        
        log_data["message"] = record.getMessage()
        
        # Add extra fields if present
        if hasattr(record, "extra") and record.extra:
            log_data.update(record.extra)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, default=str)


# ============================================
# Console Formatter with Colors
# ============================================

class ColoredFormatter(logging.Formatter):
    """Colored formatter for development console output."""
    
    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(8)
        name = record.name.ljust(20)[:20]
        message = record.getMessage()
        
        formatted = f"{color}{timestamp} | {level} | {name} | {message}{self.RESET}"
        
        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"
        
        return formatted


# ============================================
# Logger with Context
# ============================================

class ContextLogger:
    """Logger wrapper that supports context fields."""
    
    def __init__(self, logger: logging.Logger):
        self._logger = logger
        self._context: Dict[str, Any] = {}
    
    def bind(self, **kwargs: Any) -> "ContextLogger":
        """Create a new logger with additional context."""
        new_logger = ContextLogger(self._logger)
        new_logger._context = {**self._context, **kwargs}
        return new_logger
    
    def _log(self, level: int, message: str, **kwargs: Any) -> None:
        """Internal log method with context."""
        extra = {**self._context, **kwargs}
        
        # Create a LogRecord with extra data
        record = self._logger.makeRecord(
            self._logger.name,
            level,
            "",
            0,
            message,
            (),
            None,
        )
        record.extra = extra
        self._logger.handle(record)
    
    def debug(self, message: str, **kwargs: Any) -> None:
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs: Any) -> None:
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs: Any) -> None:
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs: Any) -> None:
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs: Any) -> None:
        self._log(logging.CRITICAL, message, **kwargs)
    
    def exception(self, message: str, **kwargs: Any) -> None:
        self._log(logging.ERROR, message, **kwargs)


# ============================================
# Setup Functions
# ============================================

def setup_logging(
    level: str = "INFO",
    json_format: bool = False,
    log_file: Optional[str] = None,
) -> None:
    """
    Setup logging configuration for the application.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON format for logs (production)
        log_file: Optional path to log file
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Remove existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    if json_format:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(ColoredFormatter())
    
    root_logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(JSONFormatter())
        root_logger.addHandler(file_handler)
    
    # Set levels for noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> ContextLogger:
    """
    Get a logger with context support.
    
    Args:
        name: Logger name (usually __name__)
    
    Returns:
        ContextLogger instance
    """
    return ContextLogger(logging.getLogger(name))


# ============================================
# Pre-configured Loggers
# ============================================

# Initialize logging based on settings
def init_app_logging() -> None:
    """Initialize application logging based on settings."""
    is_production = not getattr(settings, 'DEBUG', True)
    
    setup_logging(
        level="INFO" if is_production else "DEBUG",
        json_format=is_production,
        log_file="/app/logs/vili.log" if is_production else None,
    )


# Create default logger for the application
app_logger = get_logger("vili")
