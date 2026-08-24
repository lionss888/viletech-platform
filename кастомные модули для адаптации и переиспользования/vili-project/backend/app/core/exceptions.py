"""Custom exceptions for VILI application"""

from typing import Optional, Any
from fastapi import HTTPException, status


class VILIException(Exception):
    """Base exception for VILI application"""
    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class DatabaseException(VILIException):
    """Database related errors"""
    pass


class DocumentProcessingException(VILIException):
    """Document processing errors"""
    pass


class LLMException(VILIException):
    """LLM service errors"""
    pass


class RAGException(VILIException):
    """RAG service errors"""
    pass


class KnowledgeSourceException(VILIException):
    """Knowledge source errors"""
    pass


class ComplianceException(VILIException):
    """Compliance check errors"""
    pass


class RiskAssessmentException(VILIException):
    """Risk assessment errors"""
    pass


# HTTP Exceptions helpers
def not_found_exception(resource: str, resource_id: str) -> HTTPException:
    """Return 404 Not Found exception"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} with id {resource_id} not found"
    )


def bad_request_exception(message: str) -> HTTPException:
    """Return 400 Bad Request exception"""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message
    )


def unauthorized_exception(message: str = "Not authenticated") -> HTTPException:
    """Return 401 Unauthorized exception"""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def forbidden_exception(message: str = "Not enough permissions") -> HTTPException:
    """Return 403 Forbidden exception"""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message
    )


def internal_server_exception(message: str = "Internal server error") -> HTTPException:
    """Return 500 Internal Server Error exception"""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message
    )
