"""Error handling utilities."""

from typing import Any, Dict, Optional
from fastapi import HTTPException
from fastapi.responses import JSONResponse


class APIError(Exception):
    """Base API error class."""
    
    def __init__(
        self,
        message: str,
        error_type: str = "api_error",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class OllamaError(APIError):
    """Ollama service error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_type="ollama_error",
            status_code=502,
            details=details
        )


class DatabaseError(APIError):
    """Database operation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_type="database_error",
            status_code=500,
            details=details
        )


class ValidationError(APIError):
    """Validation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_type="validation_error",
            status_code=400,
            details=details
        )


def create_error_response(
    error: APIError,
    request_id: Optional[str] = None
) -> JSONResponse:
    """Create standardized error response."""
    error_data = {
        "error": {
            "type": error.error_type,
            "message": error.message,
            "details": error.details
        }
    }
    
    if request_id:
        error_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=error.status_code,
        content=error_data
    )


def handle_http_exception(request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    request_id = getattr(request.state, "request_id", None)
    
    error_data = {
        "error": {
            "type": "http_error",
            "message": exc.detail,
            "details": {"status_code": exc.status_code}
        }
    }
    
    if request_id:
        error_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_data
    )


def handle_api_error(request, exc: APIError) -> JSONResponse:
    """Handle custom API errors."""
    request_id = getattr(request.state, "request_id", None)
    return create_error_response(exc, request_id)
