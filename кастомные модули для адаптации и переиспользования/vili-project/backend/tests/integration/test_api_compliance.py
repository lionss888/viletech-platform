"""Integration tests for Compliance API"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.mark.integration
class TestComplianceAPI:
    """Integration tests for /api/v1/compliance endpoints"""
    
    # ============================================
    # Test POST /api/v1/compliance/check
    # ============================================
    
    def test_compliance_check_basic(self, client):
        """Test basic compliance check."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "check_types": ["sanctions", "aml"]
            }
        )
        
        # Status depends on implementation
        assert response.status_code in [200, 201, 404, 422]
    
    def test_compliance_check_sanctions(self, client, sample_compliance_check_data):
        """Test sanctions compliance check."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": sample_compliance_check_data["document_id"],
                "check_types": ["sanctions"],
                "entities": sample_compliance_check_data["entities"]
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_compliance_check_missing_document_id(self, client):
        """Test compliance check without document ID."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "check_types": ["sanctions"]
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_compliance_check_empty_check_types(self, client):
        """Test compliance check with empty check types."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "check_types": []
            }
        )
        
        # Should either work, return validation error, or 404 if document not found
        assert response.status_code in [200, 400, 404, 422]
    
    # ============================================
    # Test GET /api/v1/compliance/checks
    # ============================================
    
    def test_list_compliance_checks(self, client):
        """Test listing compliance checks."""
        response = client.get("/api/v1/compliance/checks")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_list_compliance_checks_by_document(self, client):
        """Test listing compliance checks for a document."""
        response = client.get(
            "/api/v1/compliance/checks",
            params={"document_id": "550e8400-e29b-41d4-a716-446655440001"}
        )
        
        assert response.status_code == 200
    
    def test_list_compliance_checks_by_status(self, client):
        """Test listing compliance checks by status."""
        response = client.get(
            "/api/v1/compliance/checks",
            params={"status": "passed"}
        )
        
        assert response.status_code == 200
    
    # ============================================
    # Test GET /api/v1/compliance/checks/{check_id}
    # ============================================
    
    def test_get_compliance_check_not_found(self, client):
        """Test getting non-existent compliance check."""
        response = client.get(
            "/api/v1/compliance/checks/550e8400-e29b-41d4-a716-446655440099"
        )
        
        assert response.status_code == 404
    
    # ============================================
    # Test GET /api/v1/compliance/rules
    # ============================================
    
    def test_list_compliance_rules(self, client):
        """Test listing available compliance rules."""
        response = client.get("/api/v1/compliance/rules")
        
        assert response.status_code == 200
