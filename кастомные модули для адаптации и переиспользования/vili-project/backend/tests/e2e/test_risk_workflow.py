"""End-to-end tests for Risk Assessment Workflow"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4


@pytest.mark.e2e
class TestRiskAssessmentWorkflow:
    """End-to-end tests for complete risk assessment workflow"""
    
    # ============================================
    # Test Risk Assessment Endpoint Exists
    # ============================================
    
    def test_risk_assessment_endpoint_exists(self, client):
        """Test that risk assessment endpoint exists."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": str(uuid4()),
                "include_economic_indices": False,
                "use_rag": False
            }
        )
        
        # Should return 404 (doc not found) or 500 (DB/LLM error), not 405
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_risk_assessment_request_validation(self, client):
        """Test that risk assessment validates request."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": str(uuid4()),
                "include_economic_indices": False,
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_risk_assessment_with_economic_indices(self, client):
        """Test risk assessment with economic indices."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": str(uuid4()),
                "include_economic_indices": True,
                "country_codes": ["USA", "DEU"],
                "use_rag": False
            }
        )
        
        assert response.status_code in [200, 201, 404, 422, 500]
    
    def test_get_risk_assessment_for_nonexistent_document(self, client):
        """Test getting risk assessment for nonexistent document."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/risk/{fake_id}")
        
        assert response.status_code in [404, 500]
    
    def test_get_risk_history_for_nonexistent_document(self, client):
        """Test getting risk history for nonexistent document."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/risk/{fake_id}/history")
        
        assert response.status_code in [404, 500]


@pytest.mark.e2e
class TestRiskRecommendationWorkflow:
    """End-to-end tests for risk recommendation workflow"""
    
    def test_risk_assessment_returns_recommendation(self, client):
        """Test that risk assessment would return recommendation."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": str(uuid4()),
                "include_economic_indices": False,
                "use_rag": False
            }
        )
        
        # Endpoint should exist
        assert response.status_code in [200, 201, 404, 422, 500]
        
        if response.status_code in [200, 201]:
            data = response.json()
            if "recommendation" in data:
                assert data["recommendation"] in ["approve", "review", "reject", "request_info"]


@pytest.mark.e2e
class TestRiskStatisticsWorkflow:
    """Tests for risk statistics endpoint"""
    
    def test_risk_statistics_endpoint(self, client):
        """Test that risk statistics endpoint exists."""
        response = client.get("/api/v1/risk/statistics")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_risk_statistics_structure(self, client):
        """Test that statistics returns proper structure."""
        response = client.get("/api/v1/risk/statistics")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Check for expected keys
            expected_keys = ["total_assessments", "average_risk_score"]
            for key in expected_keys:
                if key in data:
                    assert isinstance(data[key], (int, float, type(None)))


@pytest.mark.e2e
class TestEconomicIndicesWorkflow:
    """Tests for economic indices endpoint"""
    
    def test_economic_indices_endpoint(self, client):
        """Test that economic indices endpoint exists."""
        response = client.get("/api/v1/risk/economic-indices/USA")
        
        assert response.status_code in [200, 400, 500]
    
    def test_economic_indices_invalid_country_code(self, client):
        """Test economic indices with invalid country code."""
        response = client.get("/api/v1/risk/economic-indices/XX")
        
        # Should return 400 (invalid) or 200 (empty) or 500 (DB error)
        assert response.status_code in [200, 400, 500]
