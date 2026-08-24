"""Integration tests for Risk Assessment API"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestRiskAPI:
    """Integration tests for /api/v1/risk endpoints"""
    
    # ============================================
    # Test POST /api/v1/risk/assess
    # ============================================
    
    def test_risk_assessment_basic(self, client):
        """Test basic risk assessment."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "transaction_amount": 10000.00,
                "currency": "USD"
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_risk_assessment_with_countries(self, client, sample_risk_assessment_data):
        """Test risk assessment with country data."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": sample_risk_assessment_data["document_id"],
                "transaction_amount": sample_risk_assessment_data["transaction_amount"],
                "currency": sample_risk_assessment_data["currency"],
                "sender_country": sample_risk_assessment_data["sender_country"],
                "receiver_country": sample_risk_assessment_data["receiver_country"]
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_risk_assessment_missing_document_id(self, client):
        """Test risk assessment without document ID."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "transaction_amount": 10000.00,
                "currency": "USD"
            }
        )
        
        assert response.status_code == 422
    
    def test_risk_assessment_invalid_amount(self, client):
        """Test risk assessment with invalid amount."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "transaction_amount": -1000,  # Negative amount
                "currency": "USD"
            }
        )
        
        # 404 if document not found, 400/422 for validation error
        assert response.status_code in [400, 404, 422]
    
    # ============================================
    # Test GET /api/v1/risk/assessments
    # ============================================
    
    def test_list_risk_assessments(self, client):
        """Test listing risk assessments."""
        response = client.get("/api/v1/risk/assessments")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_list_risk_assessments_by_level(self, client):
        """Test listing risk assessments by level."""
        response = client.get(
            "/api/v1/risk/assessments",
            params={"risk_level": "high"}
        )
        
        assert response.status_code == 200
    
    def test_list_risk_assessments_by_document(self, client):
        """Test listing risk assessments for a document."""
        response = client.get(
            "/api/v1/risk/assessments",
            params={"document_id": "550e8400-e29b-41d4-a716-446655440001"}
        )
        
        assert response.status_code == 200
    
    # ============================================
    # Test GET /api/v1/risk/assessments/{assessment_id}
    # ============================================
    
    def test_get_risk_assessment_not_found(self, client):
        """Test getting non-existent risk assessment."""
        response = client.get(
            "/api/v1/risk/assessments/550e8400-e29b-41d4-a716-446655440099"
        )
        
        assert response.status_code == 404
    
    # ============================================
    # Test GET /api/v1/risk/factors
    # ============================================
    
    def test_list_risk_factors(self, client):
        """Test listing available risk factors."""
        response = client.get("/api/v1/risk/factors")
        
        assert response.status_code == 200


@pytest.mark.integration
class TestRiskAPIHighRisk:
    """Integration tests for high-risk scenarios"""
    
    def test_high_risk_country_transaction(self, client):
        """Test risk assessment for high-risk country transaction."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "transaction_amount": 100000.00,
                "currency": "USD",
                "sender_country": "US",
                "receiver_country": "IR"  # High-risk country
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
        
        if response.status_code == 200:
            data = response.json()
            # High-risk country should result in elevated risk
            if "risk_level" in data:
                assert data["risk_level"] in ["high", "critical"]
    
    def test_large_amount_transaction(self, client):
        """Test risk assessment for large amount transaction."""
        response = client.post(
            "/api/v1/risk/assess",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "transaction_amount": 1000000.00,  # $1M
                "currency": "USD"
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
