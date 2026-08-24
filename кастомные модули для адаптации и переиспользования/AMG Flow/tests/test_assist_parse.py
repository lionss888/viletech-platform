"""Tests for assist parse endpoint."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.ollama_client import ollama_client

client = TestClient(app)


class TestAssistParse:
    """Test assist parse endpoint."""

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_assist_parse_success(self, mock_create, mock_chat):
        """Test successful assist parse."""
        # Mock Ollama response with valid JSON
        mock_chat.return_value = [
            {
                "message": {
                    "content": '{"fields": {"from_city": "Москва", "to_city": "СПб", "weight": "50кг"}, "confidence": 0.95}'
                },
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/assist/parse", json={
            "text": "Нужна доставка из Москвы в СПб, 50кг, срочно",
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_data"]["from_city"] == "Москва"
        assert data["parsed_data"]["to_city"] == "СПб"
        assert data["parsed_data"]["weight"] == "50кг"
        assert data["confidence"] == 0.95
        assert data["model_used"] == "llama3.2:3b-instruct-q4_0"
        assert data["conversation_id"] == "assist-123"
        assert "request_id" in data

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_assist_parse_invalid_json(self, mock_create, mock_chat):
        """Test assist parse with invalid JSON response."""
        # Mock Ollama response with invalid JSON
        mock_chat.return_value = [
            {
                "message": {
                    "content": "I cannot parse this text into JSON format."
                },
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/assist/parse", json={
            "text": "Some random text",
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_data"]["raw_text"] == "I cannot parse this text into JSON format."
        assert data["confidence"] == 0.5  # Fallback confidence

    @patch('app.api.v1.routes.ollama_client.chat')
    def test_assist_parse_ollama_error(self, mock_chat):
        """Test assist parse with Ollama error."""
        from app.utils.errors import OllamaError
        
        # Mock Ollama error
        mock_chat.side_effect = OllamaError("Model not available")
        
        response = client.post("/v1/assist/parse", json={
            "text": "Test text",
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 502
        data = response.json()
        assert "Ollama error" in data["detail"]

    def test_assist_parse_validation_error(self):
        """Test assist parse with validation error."""
        response = client.post("/v1/assist/parse", json={
            "text": "Test text",
            # Missing convo_id
        })
        
        assert response.status_code == 422
        data = response.json()
        assert "convo_id" in str(data)

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_assist_parse_with_custom_model(self, mock_create, mock_chat):
        """Test assist parse with custom model."""
        # Mock Ollama response
        mock_chat.return_value = [
            {
                "message": {
                    "content": '{"fields": {"result": "parsed"}, "confidence": 0.9}'
                },
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/assist/parse", json={
            "text": "Test text",
            "model": "codellama:7b-instruct-q4_0",
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["model_used"] == "codellama:7b-instruct-q4_0"

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_assist_parse_with_prompt_override(self, mock_create, mock_chat):
        """Test assist parse with custom prompt."""
        # Mock Ollama response
        mock_chat.return_value = [
            {
                "message": {
                    "content": '{"fields": {"custom": "data"}, "confidence": 0.8}'
                },
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/assist/parse", json={
            "text": "Test text",
            "prompt_override": "Extract custom data in JSON format",
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 200
        
        # Verify custom prompt was used
        mock_chat.assert_called_once()
        call_args = mock_chat.call_args[0]
        messages = call_args[1]
        assert len(messages) == 2  # system + user
        assert messages[0]["role"] == "system"
        assert "Extract custom data in JSON format" in messages[0]["content"]

    @patch('app.api.v1.routes.ollama_client.chat')
    @patch('app.api.v1.routes.message_crud.create')
    def test_assist_parse_with_gen_opts(self, mock_create, mock_chat):
        """Test assist parse with generation options."""
        # Mock Ollama response
        mock_chat.return_value = [
            {
                "message": {
                    "content": '{"fields": {"result": "parsed"}, "confidence": 0.9}'
                },
                "done": True
            }
        ]
        
        # Mock database save
        mock_create.return_value = MagicMock()
        
        response = client.post("/v1/assist/parse", json={
            "text": "Test text",
            "gen_opts": {
                "temperature": 0.7,
                "max_tokens": 500
            },
            "convo_id": "assist-123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_data"]["result"] == "parsed"
