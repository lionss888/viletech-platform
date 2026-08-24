"""Unit tests for Custom Exceptions"""

import pytest
from fastapi import status

from app.core.exceptions import (
    VILIException,
    DatabaseException,
    DocumentProcessingException,
    LLMException,
    RAGException,
    KnowledgeSourceException,
    ComplianceException,
    RiskAssessmentException,
    not_found_exception,
    bad_request_exception,
    unauthorized_exception,
    forbidden_exception,
    internal_server_exception,
)


@pytest.mark.unit
class TestCustomExceptions:
    """Tests for custom exception classes"""
    
    # ============================================
    # Test VILIException base class
    # ============================================
    
    def test_vili_exception_basic(self):
        """Test VILIException with message only."""
        exc = VILIException("Test error message")
        
        assert str(exc) == "Test error message"
        assert exc.message == "Test error message"
        assert exc.details is None
    
    def test_vili_exception_with_details(self):
        """Test VILIException with message and details."""
        details = {"field": "value", "code": 123}
        exc = VILIException("Test error", details=details)
        
        assert exc.message == "Test error"
        assert exc.details == details
        assert exc.details["field"] == "value"
    
    # ============================================
    # Test derived exception classes
    # ============================================
    
    def test_database_exception(self):
        """Test DatabaseException."""
        exc = DatabaseException(
            "Database connection failed",
            details={"host": "localhost", "port": 5432}
        )
        
        assert isinstance(exc, VILIException)
        assert "Database connection failed" in str(exc)
        assert exc.details["host"] == "localhost"
    
    def test_document_processing_exception(self):
        """Test DocumentProcessingException."""
        exc = DocumentProcessingException(
            "Failed to parse PDF",
            details={"file_name": "test.pdf", "error": "Invalid format"}
        )
        
        assert isinstance(exc, VILIException)
        assert "parse PDF" in str(exc)
        assert exc.details["file_name"] == "test.pdf"
    
    def test_llm_exception(self):
        """Test LLMException."""
        exc = LLMException(
            "Model not available",
            details={"model": "gpt-4", "status_code": 503}
        )
        
        assert isinstance(exc, VILIException)
        assert "Model not available" in str(exc)
        assert exc.details["model"] == "gpt-4"
    
    def test_rag_exception(self):
        """Test RAGException."""
        exc = RAGException(
            "Vector search failed",
            details={"query": "test query", "error": "timeout"}
        )
        
        assert isinstance(exc, VILIException)
        assert "Vector search failed" in str(exc)
    
    def test_knowledge_source_exception(self):
        """Test KnowledgeSourceException."""
        exc = KnowledgeSourceException(
            "Failed to fetch URL",
            details={"url": "https://example.com", "status": 404}
        )
        
        assert isinstance(exc, VILIException)
        assert "Failed to fetch URL" in str(exc)
    
    def test_compliance_exception(self):
        """Test ComplianceException."""
        exc = ComplianceException(
            "Sanctions check failed",
            details={"entity": "ACME Corp", "list": "SDN"}
        )
        
        assert isinstance(exc, VILIException)
        assert "Sanctions check" in str(exc)
    
    def test_risk_assessment_exception(self):
        """Test RiskAssessmentException."""
        exc = RiskAssessmentException(
            "Risk calculation error",
            details={"document_id": "123", "factor": "country_risk"}
        )
        
        assert isinstance(exc, VILIException)
        assert "Risk calculation" in str(exc)


@pytest.mark.unit
class TestHTTPExceptionHelpers:
    """Tests for HTTP exception helper functions"""
    
    def test_not_found_exception(self):
        """Test 404 Not Found exception helper."""
        exc = not_found_exception("Document", "12345")
        
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "Document" in exc.detail
        assert "12345" in exc.detail
        assert "not found" in exc.detail
    
    def test_bad_request_exception(self):
        """Test 400 Bad Request exception helper."""
        exc = bad_request_exception("Invalid document format")
        
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.detail == "Invalid document format"
    
    def test_unauthorized_exception_default_message(self):
        """Test 401 Unauthorized exception with default message."""
        exc = unauthorized_exception()
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.detail == "Not authenticated"
        assert exc.headers == {"WWW-Authenticate": "Bearer"}
    
    def test_unauthorized_exception_custom_message(self):
        """Test 401 Unauthorized exception with custom message."""
        exc = unauthorized_exception("Token expired")
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.detail == "Token expired"
    
    def test_forbidden_exception_default_message(self):
        """Test 403 Forbidden exception with default message."""
        exc = forbidden_exception()
        
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.detail == "Not enough permissions"
    
    def test_forbidden_exception_custom_message(self):
        """Test 403 Forbidden exception with custom message."""
        exc = forbidden_exception("Admin access required")
        
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.detail == "Admin access required"
    
    def test_internal_server_exception_default_message(self):
        """Test 500 Internal Server Error exception with default message."""
        exc = internal_server_exception()
        
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.detail == "Internal server error"
    
    def test_internal_server_exception_custom_message(self):
        """Test 500 Internal Server Error exception with custom message."""
        exc = internal_server_exception("Service unavailable")
        
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.detail == "Service unavailable"
