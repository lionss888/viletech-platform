"""Smoke tests for ask endpoint."""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.ollama_client import ollama_client

client = TestClient(app)


class TestAskSmoke:
    """Smoke tests for ask endpoint."""

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_ask_non_stream_success(self, mock_create, mock_chat):
        """Test non-streaming ask request."""
        # Mock Ollama response
        mock_chat.return_value = [
            {
                "message": {"content": "Hello! How can I help you?"},
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/ask", json={
            "model": "llama3.2:3b-instruct-q4_0",
            "messages": [{"role": "user", "content": "Hello!"}],
            "convo_id": "test-123",
            "stream": False
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "llama3.2:3b-instruct-q4_0"
        assert data["message"]["role"] == "assistant"
        assert data["message"]["content"] == "Hello! How can I help you?"
        assert data["conversation_id"] == "test-123"
        assert "request_id" in data

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_ask_stream_success(self, mock_create, mock_chat):
        """Test streaming ask request."""
        # Mock Ollama streaming response
        async def mock_stream():
            yield {
                "message": {"content": "Hello! "},
                "done": False
            }
            yield {
                "message": {"content": "How can I help you?"},
                "done": True
            }
        
        mock_chat.return_value = mock_stream()
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/ask", json={
            "model": "llama3.2:3b-instruct-q4_0",
            "messages": [{"role": "user", "content": "Hello!"}],
            "convo_id": "test-123",
            "stream": True
        })
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        
        # Check streaming response
        content = response.text
        assert "data: " in content
        assert "Hello!" in content
        assert "How can I help you?" in content

    @patch('app.api.v1.routes.ollama_client.chat')
    def test_ask_ollama_error(self, mock_chat):
        """Test ask request with Ollama error."""
        from app.utils.errors import OllamaError
        
        # Mock Ollama error
        mock_chat.side_effect = OllamaError("Model not found")
        
        response = client.post("/v1/ask", json={
            "model": "nonexistent-model",
            "messages": [{"role": "user", "content": "Hello!"}],
            "convo_id": "test-123",
            "stream": False
        })
        
        assert response.status_code == 502
        data = response.json()
        assert "Ollama error" in data["detail"]

    def test_ask_validation_error(self):
        """Test ask request with validation error."""
        response = client.post("/v1/ask", json={
            "model": "llama3.2:3b-instruct-q4_0",
            "messages": [{"role": "user", "content": "Hello!"}],
            # Missing convo_id
            "stream": False
        })
        
        assert response.status_code == 422
        data = response.json()
        assert "convo_id" in str(data)

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_ask_with_system_prompt(self, mock_create, mock_chat):
        """Test ask request with system prompt."""
        # Mock Ollama response
        mock_chat.return_value = [
            {
                "message": {"content": "I'm a helpful assistant."},
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/ask", json={
            "model": "llama3.2:3b-instruct-q4_0",
            "messages": [{"role": "user", "content": "What are you?"}],
            "convo_id": "test-123",
            "stream": False,
            "system_prompt_type": "assistant"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"]["content"] == "I'm a helpful assistant."
        
        # Verify system prompt was added
        mock_chat.assert_called_once()
        call_args = mock_chat.call_args[0]
        messages = call_args[1]
        assert len(messages) == 2  # system + user
        assert messages[0]["role"] == "system"