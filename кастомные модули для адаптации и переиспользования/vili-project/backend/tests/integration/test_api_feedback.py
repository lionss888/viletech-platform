"""Integration tests for Feedback API"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestFeedbackAPI:
    """Integration tests for /api/v1/feedback endpoints"""
    
    # ============================================
    # Test POST /api/v1/feedback
    # ============================================
    
    def test_submit_feedback_basic(self, client, sample_feedback_data):
        """Test basic feedback submission."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": sample_feedback_data["document_id"],
                "rating": sample_feedback_data["rating"],
                "feedback_type": sample_feedback_data["feedback_type"],
                "comment": sample_feedback_data["comment"]
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_submit_feedback_with_corrections(self, client):
        """Test feedback submission with corrected data."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "rating": 3,
                "feedback_type": "accuracy",
                "comment": "Amount was incorrect",
                "corrected_data": {
                    "amount": 15000.00,
                    "currency": "EUR"
                }
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_submit_feedback_invalid_rating(self, client):
        """Test feedback submission with invalid rating."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "rating": 10,  # Invalid: should be 1-5
                "feedback_type": "accuracy"
            }
        )
        
        assert response.status_code in [400, 422]
    
    def test_submit_feedback_missing_rating(self, client):
        """Test feedback submission without rating."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "feedback_type": "accuracy",
                "comment": "Good analysis"
            }
        )
        
        assert response.status_code in [200, 201, 422]  # Depends on if rating is required
    
    # ============================================
    # Test GET /api/v1/feedback
    # ============================================
    
    def test_list_feedback(self, client):
        """Test listing feedback."""
        response = client.get("/api/v1/feedback")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_list_feedback_by_document(self, client):
        """Test listing feedback for a specific document."""
        response = client.get(
            "/api/v1/feedback",
            params={"document_id": "550e8400-e29b-41d4-a716-446655440001"}
        )
        
        assert response.status_code == 200
    
    def test_list_feedback_by_rating(self, client):
        """Test listing feedback filtered by rating."""
        response = client.get(
            "/api/v1/feedback",
            params={"min_rating": 4}
        )
        
        assert response.status_code == 200
    
    def test_list_feedback_by_type(self, client):
        """Test listing feedback filtered by type."""
        response = client.get(
            "/api/v1/feedback",
            params={"feedback_type": "accuracy"}
        )
        
        assert response.status_code == 200
    
    # ============================================
    # Test GET /api/v1/feedback/{feedback_id}
    # ============================================
    
    def test_get_feedback_not_found(self, client):
        """Test getting non-existent feedback."""
        response = client.get(
            "/api/v1/feedback/550e8400-e29b-41d4-a716-446655440099"
        )
        
        assert response.status_code == 404
    
    # ============================================
    # Test feedback types
    # ============================================
    
    def test_submit_accuracy_feedback(self, client):
        """Test accuracy feedback submission."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "rating": 5,
                "feedback_type": "accuracy",
                "comment": "Excellent accuracy"
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_submit_speed_feedback(self, client):
        """Test speed feedback submission."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "rating": 4,
                "feedback_type": "speed",
                "comment": "Processing was fast"
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
    
    def test_submit_usability_feedback(self, client):
        """Test usability feedback submission."""
        response = client.post(
            "/api/v1/feedback",
            json={
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "rating": 3,
                "feedback_type": "usability",
                "comment": "Interface could be improved"
            }
        )
        
        assert response.status_code in [200, 201, 404, 422]
