"""Tests for releases endpoints."""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app


class TestReleasesEndpoints:
    """Test releases endpoints functionality."""

    def setup_method(self):
        """Setup test client."""
        self.client = TestClient(app)

    def test_get_releases_success(self):
        """Test successful releases list retrieval."""
        # Test request
        response = self.client.get("/v1/releases")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "releases" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        
        # Verify default pagination
        assert data["limit"] == 50
        assert data["offset"] == 0
        assert isinstance(data["releases"], list)
        assert data["total"] >= 0

    def test_get_releases_with_pagination(self):
        """Test releases with custom pagination parameters."""
        # Test request with pagination
        response = self.client.get("/v1/releases?limit=10&offset=5")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination
        assert data["limit"] == 10
        assert data["offset"] == 5
        assert len(data["releases"]) <= 10

    def test_get_releases_with_status_filter(self):
        """Test releases with status filter."""
        # Test different status filters
        status_filters = ["stable", "candidate", "beta", "alpha"]
        
        for status in status_filters:
            response = self.client.get(f"/v1/releases?status={status}")
            
            # Verify response
            assert response.status_code == 200
            data = response.json()
            
            # Verify filtered results
            for release in data["releases"]:
                assert release["status"] == status

    def test_get_releases_invalid_parameters(self):
        """Test releases with invalid parameters."""
        # Test negative limit
        response = self.client.get("/v1/releases?limit=-1")
        assert response.status_code == 422  # Validation error

        # Test negative offset  
        response = self.client.get("/v1/releases?offset=-1")
        assert response.status_code == 422  # Validation error

        # Test excessive limit
        response = self.client.get("/v1/releases?limit=10000")
        # Should either work or return validation error
        assert response.status_code in [200, 422]

    def test_get_releases_empty_result(self):
        """Test releases when no releases match criteria."""
        # Test with non-existent status
        response = self.client.get("/v1/releases?status=nonexistent")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["releases"] == []
        assert data["total"] == 0

    def test_get_specific_release_success(self):
        """Test successful specific release retrieval."""
        # Test request
        release_id = "test-release-1"
        response = self.client.get(f"/v1/releases/{release_id}")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "release" in data
        release = data["release"]
        
        # Verify required fields
        assert "id" in release
        assert "name" in release
        assert "version" in release
        assert "status" in release
        assert "created_at" in release
        assert "updated_at" in release
        
        # Verify ID matches request
        assert release["id"] == release_id

    def test_get_specific_release_various_ids(self):
        """Test specific release with various ID formats."""
        # Test different ID formats
        test_ids = [
            "123",
            "release-456", 
            "v1.0.0",
            "myco-ops-v2",
            "test_release_789"
        ]
        
        for release_id in test_ids:
            response = self.client.get(f"/v1/releases/{release_id}")
            
            # Should return 200 (mock always returns data)
            assert response.status_code == 200
            data = response.json()
            assert data["release"]["id"] == release_id

    def test_get_release_special_characters(self):
        """Test release ID with special characters."""
        # Test URL-encoded special characters
        import urllib.parse
        
        special_ids = [
            "release with spaces",
            "release@domain.com",
            "release#123",
            "release%test"
        ]
        
        for release_id in special_ids:
            encoded_id = urllib.parse.quote(release_id, safe='')
            response = self.client.get(f"/v1/releases/{encoded_id}")
            
            # Mock implementation should handle this
            assert response.status_code in [200, 404]

    def test_releases_response_structure(self):
        """Test that releases have proper structure."""
        # Get releases
        response = self.client.get("/v1/releases")
        assert response.status_code == 200
        data = response.json()
        
        # Test each release structure
        for release in data["releases"]:
            # Required fields
            assert isinstance(release["id"], str)
            assert isinstance(release["name"], str)
            assert isinstance(release["version"], str)
            assert isinstance(release["status"], str)
            
            # Date fields should be valid ISO format
            datetime.fromisoformat(release["created_at"].replace('Z', '+00:00'))
            datetime.fromisoformat(release["updated_at"].replace('Z', '+00:00'))
            
            # Optional fields
            if "description" in release:
                assert isinstance(release["description"], (str, type(None)))
            if "metadata" in release:
                assert isinstance(release["metadata"], (dict, type(None)))

    def test_releases_request_id_header(self):
        """Test that releases endpoints include request ID."""
        custom_request_id = "test-releases-123"
        
        # Test list endpoint
        response = self.client.get(
            "/v1/releases",
            headers={"X-Request-ID": custom_request_id}
        )
        assert response.status_code == 200
        assert response.headers.get("X-Request-ID") == custom_request_id
        
        # Test specific release endpoint
        response = self.client.get(
            "/v1/releases/test-id",
            headers={"X-Request-ID": custom_request_id}
        )
        assert response.status_code == 200
        assert response.headers.get("X-Request-ID") == custom_request_id

    def test_releases_concurrent_access(self):
        """Test concurrent access to releases endpoints."""
        import concurrent.futures
        
        def make_request():
            return self.client.get("/v1/releases")
        
        # Test concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200

    def test_releases_performance(self):
        """Test releases endpoint response time."""
        import time
        
        # Measure response time
        start_time = time.time()
        response = self.client.get("/v1/releases")
        end_time = time.time()
        
        # Verify response and timing
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 1.0  # Should respond within 1 second

    def test_releases_data_consistency(self):
        """Test data consistency across multiple requests."""
        # Make multiple requests
        responses = []
        for _ in range(5):
            response = self.client.get("/v1/releases")
            assert response.status_code == 200
            responses.append(response.json())
        
        # Verify consistent data (mock should return same data)
        first_response = responses[0]
        for response_data in responses[1:]:
            assert response_data["total"] == first_response["total"]
            assert len(response_data["releases"]) == len(first_response["releases"])

    def test_releases_edge_cases(self):
        """Test edge cases for releases endpoints."""
        # Test with maximum valid limit
        response = self.client.get("/v1/releases?limit=1000")
        assert response.status_code in [200, 422]  # Depends on validation rules
        
        # Test with zero limit
        response = self.client.get("/v1/releases?limit=0")
        assert response.status_code == 422  # Should be validation error
        
        # Test with very large offset
        response = self.client.get("/v1/releases?offset=999999")
        assert response.status_code == 200
        data = response.json()
        assert data["releases"] == []  # Should return empty list
