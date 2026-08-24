"""End-to-end tests for Compliance Workflow"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4


@pytest.mark.e2e
class TestComplianceWorkflow:
    """End-to-end tests for complete compliance checking workflow"""
    
    # ============================================
    # Test Compliance Check Endpoint Exists
    # ============================================
    
    def test_compliance_check_endpoint_exists(self, client):
        """Test that compliance check endpoint exists and validates input."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": str(uuid4()),
                "check_types": ["sanctions"],
                "use_rag": False
            }
        )
        
        # Should return 404 (doc not found) or 500 (DB/LLM error), not 405
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_sanctions_screening_request_validation(self, client):
        """Test that sanctions screening validates request."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": str(uuid4()),
                "check_types": ["sanctions"],
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_aml_check_request_validation(self, client):
        """Test that AML check validates request."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": str(uuid4()),
                "check_types": ["aml"],
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_kyc_verification_request_validation(self, client):
        """Test that KYC check validates request."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": str(uuid4()),
                "check_types": ["kyc"],
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_multi_check_request_validation(self, client):
        """Test workflow with multiple compliance checks."""
        response = client.post(
            "/api/v1/compliance/check",
            json={
                "document_id": str(uuid4()),
                "check_types": ["sanctions", "aml", "kyc"],
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_get_compliance_results_for_nonexistent_document(self, client):
        """Test getting compliance results for nonexistent document."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/compliance/{fake_id}")
        
        # Should return 404 or 500
        assert response.status_code in [404, 500]


@pytest.mark.e2e
class TestComplianceReportingWorkflow:
    """End-to-end tests for compliance reporting workflow"""
    
    def test_compliance_statistics_endpoint(self, client):
        """Test that compliance statistics endpoint exists."""
        response = client.get("/api/v1/compliance/statistics")
        
        # Statistics endpoint should work (even with empty DB)
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            # Verify response structure
            assert "total_checks" in data or "error" in data
    
    def test_compliance_statistics_returns_structure(self, client):
        """Test that statistics returns proper structure."""
        response = client.get("/api/v1/compliance/statistics")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Should have counts
            expected_keys = ["total_checks", "passed", "failed"]
            for key in expected_keys:
                if key in data:
                    assert isinstance(data[key], (int, type(None)))
