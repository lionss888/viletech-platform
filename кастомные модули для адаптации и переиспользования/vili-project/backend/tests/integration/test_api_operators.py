"""Integration tests for Operators API endpoints.

Tests the REST API endpoints for operator analytics including:
- GET /operators - list all operators
- GET /operators/{id}/analytics - detailed analytics
- GET /operators/{id}/compliance - compliance score
- POST /operators/compare - compare operators
- POST /operators/recommendations - get recommendations

These tests use TestClient with the conftest.py fixtures.
"""

import pytest

# Note: client fixture is provided by conftest.py


# Test UUIDs from demo data
SENIOR_OPERATOR_ID = "550e8400-e29b-41d4-a716-446655440001"
MIDDLE_OPERATOR_ID = "550e8400-e29b-41d4-a716-446655440002"
JUNIOR_OPERATOR_ID = "550e8400-e29b-41d4-a716-446655440003"
FAKE_OPERATOR_ID = "00000000-0000-0000-0000-000000000000"


# Remove local client fixture - use the one from conftest.py

class TestListOperators:
    """Tests for GET /operators endpoint."""
    
    def test_list_operators_success(self, client):
        """Test successful listing of operators."""
        response = client.get("/api/v1/operators")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "operators" in data
        assert "team_stats" in data
        assert isinstance(data["operators"], list)
    
    def test_list_operators_returns_team_stats(self, client):
        """Test that team stats are included in response."""
        response = client.get("/api/v1/operators")
        
        assert response.status_code == 200
        data = response.json()
        
        team_stats = data.get("team_stats", {})
        assert "avg_success_rate" in team_stats or team_stats == {}


class TestGetOperatorAnalytics:
    """Tests for GET /operators/{id}/analytics endpoint."""
    
    def test_get_analytics_success(self, client):
        """Test successful analytics retrieval."""
        response = client.get(f"/api/v1/operators/{SENIOR_OPERATOR_ID}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["operator_id"] == SENIOR_OPERATOR_ID
        assert "profile" in data
        assert "metrics" in data
        assert "compliance_score" in data
        assert "analysis_summary" in data
    
    def test_get_analytics_with_forecast(self, client):
        """Test analytics with forecast included."""
        response = client.get(
            f"/api/v1/operators/{SENIOR_OPERATOR_ID}/analytics",
            params={"include_forecast": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "forecast" in data
        if data["forecast"]:
            assert "predicted_applications" in data["forecast"]
            assert "trend" in data["forecast"]
    
    def test_get_analytics_with_recommendations(self, client):
        """Test analytics with recommendations included."""
        response = client.get(
            f"/api/v1/operators/{JUNIOR_OPERATOR_ID}/analytics",
            params={"include_recommendations": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
    
    def test_get_analytics_with_team_comparison(self, client):
        """Test analytics with team comparison."""
        response = client.get(
            f"/api/v1/operators/{SENIOR_OPERATOR_ID}/analytics",
            params={"compare_with_team": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "team_comparison" in data
    
    def test_get_analytics_not_found(self, client):
        """Test analytics for non-existent operator returns 404."""
        response = client.get(f"/api/v1/operators/{FAKE_OPERATOR_ID}/analytics")
        
        assert response.status_code == 404
    
    def test_get_analytics_invalid_uuid(self, client):
        """Test analytics with invalid UUID returns 422."""
        response = client.get("/api/v1/operators/invalid-uuid/analytics")
        
        assert response.status_code == 422


class TestGetOperatorForecast:
    """Tests for POST /operators/{id}/forecast endpoint."""
    
    def test_get_forecast_success(self, client):
        """Test successful forecast retrieval."""
        response = client.post(f"/api/v1/operators/{SENIOR_OPERATOR_ID}/forecast")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "forecast_period_days" in data
        assert "predicted_applications" in data
        assert "predicted_success_rate" in data
        assert "trend" in data
        assert "confidence" in data
    
    def test_get_forecast_not_found(self, client):
        """Test forecast for non-existent operator returns 404."""
        response = client.post(f"/api/v1/operators/{FAKE_OPERATOR_ID}/forecast")
        
        assert response.status_code == 404


class TestGetOperatorCompliance:
    """Tests for GET /operators/{id}/compliance endpoint."""
    
    def test_get_compliance_success(self, client):
        """Test successful compliance score retrieval."""
        response = client.get(f"/api/v1/operators/{SENIOR_OPERATOR_ID}/compliance")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["operator_id"] == SENIOR_OPERATOR_ID
        assert "overall_score" in data
        assert "risk_level" in data
        assert "kyc_compliance" in data
        assert "aml_compliance" in data
        assert "sanctions_compliance" in data
        assert "detection_rate" in data
        assert "false_negative_rate" in data
    
    def test_get_compliance_includes_violations(self, client):
        """Test compliance includes violations list."""
        response = client.get(f"/api/v1/operators/{JUNIOR_OPERATOR_ID}/compliance")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "violations" in data
        assert isinstance(data["violations"], list)
    
    def test_get_compliance_not_found(self, client):
        """Test compliance for non-existent operator returns 404."""
        response = client.get(f"/api/v1/operators/{FAKE_OPERATOR_ID}/compliance")
        
        assert response.status_code == 404


class TestCompareOperators:
    """Tests for POST /operators/compare endpoint."""
    
    def test_compare_operators_success(self, client):
        """Test successful comparison of operators."""
        response = client.post(
            "/api/v1/operators/compare",
            json={
                "operator_ids": [SENIOR_OPERATOR_ID, JUNIOR_OPERATOR_ID],
                "metrics_to_compare": ["success_rate", "compliance_score"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "operators" in data
        assert "best_performer" in data
        assert "team_averages" in data
        assert "comparison_summary" in data
    
    def test_compare_operators_with_needs_attention(self, client):
        """Test comparison includes operators needing attention."""
        response = client.post(
            "/api/v1/operators/compare",
            json={
                "operator_ids": [SENIOR_OPERATOR_ID, JUNIOR_OPERATOR_ID],
                "metrics_to_compare": ["compliance_score"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "needs_attention" in data
        assert isinstance(data["needs_attention"], list)
    
    def test_compare_operators_validation_error(self, client):
        """Test comparison with less than 2 operators fails."""
        response = client.post(
            "/api/v1/operators/compare",
            json={
                "operator_ids": [SENIOR_OPERATOR_ID],  # Only 1 operator
                "metrics_to_compare": ["success_rate"]
            }
        )
        
        assert response.status_code == 422


class TestGetRecommendations:
    """Tests for POST /operators/recommendations endpoint."""
    
    def test_get_recommendations_for_operator(self, client):
        """Test getting recommendations for specific operator."""
        response = client.post(
            "/api/v1/operators/recommendations",
            json={
                "operator_id": JUNIOR_OPERATOR_ID,
                "use_rag": False,
                "max_recommendations": 5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["operator_id"] == JUNIOR_OPERATOR_ID
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) <= 5
    
    def test_get_recommendations_for_team(self, client):
        """Test getting recommendations for whole team."""
        response = client.post(
            "/api/v1/operators/recommendations",
            json={
                "operator_id": None,
                "use_rag": False,
                "max_recommendations": 3
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["operator_id"] is None
        assert "recommendations" in data


class TestGetStatistics:
    """Tests for GET /operators/statistics endpoint."""
    
    def test_get_statistics_success(self, client):
        """Test successful statistics retrieval."""
        response = client.get("/api/v1/operators/statistics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_operators" in data
        assert "by_level" in data
        assert "team_stats" in data


class TestValidation:
    """Tests for request validation."""
    
    def test_analytics_period_validation(self, client):
        """Test period_days validation in analytics request."""
        # Too large period
        response = client.get(
            f"/api/v1/operators/{SENIOR_OPERATOR_ID}/analytics",
            params={"period_days": 500}  # Max is 365
        )
        
        assert response.status_code == 422
    
    def test_compare_max_operators(self, client):
        """Test max operators limit in comparison."""
        # Create 11 UUIDs (max is 10)
        many_ids = [f"550e8400-e29b-41d4-a716-44665544{str(i).zfill(4)}" for i in range(11)]
        
        response = client.post(
            "/api/v1/operators/compare",
            json={
                "operator_ids": many_ids,
                "metrics_to_compare": ["success_rate"]
            }
        )
        
        assert response.status_code == 422
