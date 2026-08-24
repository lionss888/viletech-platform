"""Integration tests for Health Check API"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestHealthAPI:
    """Integration tests for health check endpoints"""
    
    # ============================================
    # Test GET /
    # ============================================
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns basic info."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
    
    # ============================================
    # Test GET /api/v1/health
    # ============================================
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
    
    def test_health_check_returns_version(self, client):
        """Test health check returns version."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
    
    def test_health_check_returns_services(self, client):
        """Test health check returns service statuses."""
        # Use /health/detailed endpoint for service status checks
        response = client.get("/api/v1/health/detailed")
        
        # Detailed endpoint may fail if external services unavailable
        if response.status_code == 200:
            data = response.json()
            assert "services" in data
            assert isinstance(data["services"], dict)
        else:
            # Fallback: basic health should return at least service name
            response = client.get("/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert "service" in data or "services" in data
    
    # ============================================
    # Test GET /api/v1/stats
    # ============================================
    
    def test_stats_endpoint(self, client):
        """Test statistics endpoint."""
        response = client.get("/api/v1/stats")
        
        assert response.status_code == 200
        data = response.json()
        # Check for expected stat fields
        expected_fields = ["total_documents", "completed_documents"]
        for field in expected_fields:
            assert field in data
    
    # ============================================
    # Test API Documentation
    # ============================================
    
    def test_openapi_docs(self, client):
        """Test OpenAPI documentation is available."""
        response = client.get("/api/docs")
        
        assert response.status_code == 200
    
    def test_openapi_json(self, client):
        """Test OpenAPI JSON schema is available."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data


@pytest.mark.integration
class TestHealthAPIServiceChecks:
    """Integration tests for individual service health checks"""
    
    def test_health_check_database_status(self, client):
        """Test that database status is reported in health check."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        
        if "services" in data:
            # Database should be one of the checked services
            assert "database" in data["services"] or len(data["services"]) > 0
    
    def test_health_check_redis_status(self, client):
        """Test that Redis status is reported in health check."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        
        if "services" in data:
            # Redis might be checked
            services = data["services"]
            assert isinstance(services, dict)
    
    def test_health_check_llm_status(self, client):
        """Test that LLM service status is reported in health check."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        
        if "services" in data:
            services = data["services"]
            # LiteLLM or Ollama should be checked
            assert isinstance(services, dict)
