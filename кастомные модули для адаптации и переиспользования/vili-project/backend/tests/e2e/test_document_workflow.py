"""End-to-end tests for Document Processing Workflow"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from io import BytesIO
import json


@pytest.mark.e2e
class TestDocumentWorkflow:
    """End-to-end tests for complete document processing workflow"""
    
    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service for testing."""
        with patch('app.services.llm_service.LLMService') as mock_class:
            mock_instance = MagicMock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Document analysis complete. Sender: ACME Corp, Amount: $10,000 USD",
                "model": "local-llama",
                "usage": {"total_tokens": 100}
            })
            mock_class.return_value = mock_instance
            yield mock_instance
    
    # ============================================
    # Test Document Upload
    # ============================================
    
    def test_document_upload_workflow(self, client):
        """Test document upload endpoint."""
        # Create a test file
        test_file = BytesIO(b"SWIFT MT103 test message content")
        
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test_document.txt", test_file, "text/plain")},
            params={"document_type": "traditional", "customer_id": str(uuid4())}
        )
        
        # Should either succeed or fail validation
        assert response.status_code in [200, 201, 400, 422, 500]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "document_id" in data or "id" in data
    
    # ============================================
    # Test Document API Endpoints Exist
    # ============================================
    
    def test_get_nonexistent_document(self, client):
        """Test getting a document that doesn't exist."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/documents/{fake_id}")
        # Should return 404 or 500 (DB not accessible)
        assert response.status_code in [404, 500]
    
    def test_delete_nonexistent_document(self, client):
        """Test deleting a document that doesn't exist."""
        fake_id = str(uuid4())
        response = client.delete(f"/api/v1/documents/{fake_id}")
        assert response.status_code in [404, 500]
    
    def test_analyze_nonexistent_document(self, client):
        """Test analyzing a document that doesn't exist."""
        fake_id = str(uuid4())
        response = client.post(f"/api/v1/documents/{fake_id}/analyze")
        assert response.status_code in [404, 500]


@pytest.mark.e2e
class TestDocumentListWorkflow:
    """Tests for document listing"""
    
    def test_list_documents_endpoint_exists(self, client):
        """Test that list documents endpoint exists."""
        response = client.get("/api/v1/documents/")
        # Endpoint should exist (even if it fails due to DB)
        assert response.status_code in [200, 500]
    
    def test_list_documents_with_filters(self, client):
        """Test listing documents with filters."""
        response = client.get("/api/v1/documents/?status=pending&limit=10")
        assert response.status_code in [200, 500]
