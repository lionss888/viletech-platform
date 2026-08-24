"""Tests for models endpoint."""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.utils.errors import OllamaError


class TestModelsEndpoint:
    """Test models endpoint functionality."""

    def setup_method(self):
        """Setup test client."""
        self.client = TestClient(app)

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_success(self, mock_get_models):
        """Test successful models retrieval."""
        # Mock Ollama response
        mock_get_models.return_value = {
            "models": [
                {
                    "name": "llama3.2:3b-instruct-q4_0",
                    "size": 2048000000,
                    "modified_at": "2025-01-01T12:00:00Z"
                },
                {
                    "name": "codellama:7b",
                    "size": 4096000000,
                    "modified_at": "2025-01-01T10:30:00Z"
                }
            ]
        }

        # Test request
        response = self.client.get("/v1/models")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 2
        
        # Verify first model
        first_model = data["models"][0]
        assert first_model["name"] == "llama3.2:3b-instruct-q4_0"
        assert first_model["size"] == 2048000000
        assert "modified_at" in first_model

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_empty_list(self, mock_get_models):
        """Test models endpoint with empty model list."""
        # Mock empty response
        mock_get_models.return_value = {"models": []}

        # Test request
        response = self.client.get("/v1/models")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 0

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_ollama_error(self, mock_get_models):
        """Test models endpoint when Ollama is unavailable."""
        # Mock Ollama error
        mock_get_models.side_effect = OllamaError("Cannot connect to Ollama server")

        # Test request
        response = self.client.get("/v1/models")

        # Verify error response
        assert response.status_code == 502
        data = response.json()
        assert "detail" in data
        assert "Ollama error" in data["detail"]

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_malformed_response(self, mock_get_models):
        """Test handling of malformed Ollama response."""
        # Mock malformed response
        mock_get_models.return_value = {"invalid": "structure"}

        # Test request
        response = self.client.get("/v1/models")

        # Verify response (should handle gracefully)
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        # Should default to empty list when models key is missing
        assert data["models"] == []

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_large_list(self, mock_get_models):
        """Test models endpoint with large number of models."""
        # Mock large model list
        models = []
        for i in range(50):
            models.append({
                "name": f"model-{i}:latest",
                "size": 1000000000 + i * 100000000,
                "modified_at": f"2025-01-{1+i%30:02d}T12:00:00Z"
            })

        mock_get_models.return_value = {"models": models}

        # Test request
        response = self.client.get("/v1/models")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 50

    def test_get_models_request_id_header(self):
        """Test that models endpoint includes request ID in response."""
        with patch('app.api.v1.routes.ollama_client.get_models') as mock_get_models:
            mock_get_models.return_value = {"models": []}

            # Test request with custom request ID
            custom_request_id = "test-request-123"
            response = self.client.get(
                "/v1/models",
                headers={"X-Request-ID": custom_request_id}
            )

            # Verify request ID in response headers
            assert response.status_code == 200
            assert "X-Request-ID" in response.headers
            assert response.headers["X-Request-ID"] == custom_request_id

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_concurrent_requests(self, mock_get_models):
        """Test concurrent requests to models endpoint."""
        # Mock response
        mock_get_models.return_value = {
            "models": [{"name": "test:latest", "size": 1000, "modified_at": "2025-01-01T12:00:00Z"}]
        }

        # Simulate concurrent requests
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(self.client.get, "/v1/models") for _ in range(10)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # Verify all responses are successful
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert len(data["models"]) == 1

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_response_time(self, mock_get_models):
        """Test models endpoint response time."""
        import time
        
        # Mock response
        mock_get_models.return_value = {"models": []}

        # Measure response time
        start_time = time.time()
        response = self.client.get("/v1/models")
        end_time = time.time()

        # Verify response and timing
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 1.0  # Should respond within 1 second

    @patch('app.api.v1.routes.ollama_client.get_models')
    def test_get_models_with_special_characters(self, mock_get_models):
        """Test models with special characters in names."""
        # Mock response with special characters
        mock_get_models.return_value = {
            "models": [
                {
                    "name": "model-with-dashes:v1.0",
                    "size": 1000000,
                    "modified_at": "2025-01-01T12:00:00Z"
                },
                {
                    "name": "model_with_underscores:latest",
                    "size": 2000000,
                    "modified_at": "2025-01-01T11:00:00Z"
                }
            ]
        }

        # Test request
        response = self.client.get("/v1/models")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert len(data["models"]) == 2
        
        model_names = [model["name"] for model in data["models"]]
        assert "model-with-dashes:v1.0" in model_names
        assert "model_with_underscores:latest" in model_names
