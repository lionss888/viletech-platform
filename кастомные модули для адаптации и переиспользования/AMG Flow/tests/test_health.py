"""Tests for health check endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine

from app.main import app
from app.ollama_client import ollama_client

client = TestClient(app)


class TestHealthChecks:
    """Test health check endpoints."""

    def test_health_check_success(self):
        """Test basic health check."""
        response = client.get("/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    @patch.object(ollama_client, 'ping')
    def test_ollama_health_check_success(self, mock_ping):
        """Test Ollama health check success."""
        mock_ping.return_value = {
            "ok": True,
            "host": "http://localhost:11434",
            "latency_ms": 15
        }
        
        response = client.get("/v1/health/ollama")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["host"] == "http://localhost:11434"
        assert data["latency_ms"] == 15
        assert data["error"] is None

    @patch.object(ollama_client, 'ping')
    def test_ollama_health_check_failure(self, mock_ping):
        """Test Ollama health check failure."""
        from app.utils.errors import OllamaError
        mock_ping.side_effect = OllamaError("Connection failed")
        
        response = client.get("/v1/health/ollama")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["host"] == "http://localhost:11434"
        assert data["error"] == "Connection failed"

    @patch('app.api.v1.routes.engine')
    def test_database_health_check_success(self, mock_engine):
        """Test database health check success."""
        # Mock engine.connect()
        mock_conn = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        
        response = client.get("/v1/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "latency_ms" in data
        assert data["error"] is None

    @patch('app.api.v1.routes.engine')
    def test_database_health_check_failure(self, mock_engine):
        """Test database health check failure."""
        # Mock engine.connect() to raise exception
        mock_engine.connect.side_effect = Exception("Connection failed")
        
        response = client.get("/v1/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"] == "Connection failed"