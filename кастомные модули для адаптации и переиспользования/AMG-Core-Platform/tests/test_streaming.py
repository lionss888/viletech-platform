"""Tests for streaming functionality."""

import json
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
import httpx

from app.main import app
from app.ollama_client import OllamaClient


class TestOllamaClientStreaming:
    """Test OllamaClient streaming functionality."""
    
    @pytest.mark.asyncio
    async def test_generate_stream_success(self):
        """Test successful streaming generation."""
        client = OllamaClient()
        
        # Mock streaming response
        mock_chunks = [
            {"response": "Hello", "done": False},
            {"response": " world", "done": False},
            {"response": "!", "done": True}
        ]
        
        with patch.object(client, 'client') as mock_http_client:
            # Mock the streaming context manager
            mock_response = AsyncMock()
            mock_response.raise_for_status = AsyncMock()
            mock_response.aiter_lines = AsyncMock(return_value=[
                json.dumps(chunk) for chunk in mock_chunks
            ])
            
            mock_http_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
            mock_http_client.stream.return_value.__aexit__ = AsyncMock(return_value=None)
            
            # Test streaming
            chunks = []
            async for chunk in client.generate_stream("test-model", "test prompt"):
                chunks.append(chunk)
            
            # Verify chunks
            assert len(chunks) == 3
            assert chunks[0]["response"] == "Hello"
            assert chunks[1]["response"] == " world"
            assert chunks[2]["response"] == "!"
            assert chunks[2]["done"] is True
    
    @pytest.mark.asyncio
    async def test_generate_stream_error_handling(self):
        """Test error handling in streaming."""
        client = OllamaClient()
        
        with patch.object(client, 'client') as mock_http_client:
            # Mock connection error
            mock_http_client.stream.side_effect = httpx.ConnectError("Connection failed")
            
            # Test that error is properly raised
            with pytest.raises(Exception) as exc_info:
                async for chunk in client.generate_stream("test-model", "test prompt"):
                    pass
            
            assert "Cannot connect to Ollama server" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_generate_stream_invalid_json(self):
        """Test handling of invalid JSON in stream."""
        client = OllamaClient()
        
        with patch.object(client, 'client') as mock_http_client:
            # Mock response with invalid JSON
            mock_response = AsyncMock()
            mock_response.raise_for_status = AsyncMock()
            mock_response.aiter_lines = AsyncMock(return_value=[
                "invalid json",
                json.dumps({"response": "valid", "done": True})
            ])
            
            mock_http_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
            mock_http_client.stream.return_value.__aexit__ = AsyncMock(return_value=None)
            
            # Test that invalid JSON is skipped
            chunks = []
            async for chunk in client.generate_stream("test-model", "test prompt"):
                chunks.append(chunk)
            
            # Should only get the valid chunk
            assert len(chunks) == 1
            assert chunks[0]["response"] == "valid"


class TestStreamingAPI:
    """Test API streaming endpoints."""
    
    def setup_method(self):
        """Setup test client."""
        self.client = TestClient(app)
    
    @patch('app.main.ollama_client')
    def test_streaming_chat_format(self, mock_ollama_client):
        """Test streaming with chat format."""
        # Mock streaming response
        async def mock_generate_stream(model, prompt):
            yield {"response": "Hello", "done": False}
            yield {"response": " there", "done": False}
            yield {"response": "!", "done": True}
        
        mock_ollama_client.generate_stream = mock_generate_stream
        
        # Test streaming request
        request_data = {
            "model": "test-model",
            "messages": [{"role": "user", "content": "Hello"}],
            "convo_id": "test-123",
            "stream": True
        }
        
        response = self.client.post("/v1/ask", json=request_data)
        
        # Verify response
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        
        # Parse SSE response
        content = response.text
        lines = content.strip().split('\n\n')
        
        # Should have data chunks
        assert len(lines) >= 3  # At least 3 chunks + done
        assert "data:" in content
        assert '"message":{"content":"Hello"}' in content
        assert '"done":true' in content
    
    @patch('app.main.ollama_client')
    def test_non_streaming_fallback(self, mock_ollama_client):
        """Test that non-streaming still works."""
        # Mock regular response
        mock_ollama_client.generate = AsyncMock(return_value={
            "response": "Hello world!"
        })
        
        # Test non-streaming request
        request_data = {
            "model": "test-model",
            "messages": [{"role": "user", "content": "Hello"}],
            "convo_id": "test-123",
            "stream": False
        }
        
        response = self.client.post("/v1/ask", json=request_data)
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["message"]["content"] == "Hello world!"
        assert data["conversation_id"] == "test-123"
    
    @patch('app.main.ollama_client')
    def test_streaming_simple_format(self, mock_ollama_client):
        """Test streaming with simple format."""
        # Mock streaming response
        async def mock_generate_stream(model, prompt):
            yield {"response": "Simple", "done": False}
            yield {"response": " response", "done": True}
        
        mock_ollama_client.generate_stream = mock_generate_stream
        
        # Test simple streaming request
        request_data = {
            "question": "Test question",
            "stream": True
        }
        
        response = self.client.post("/v1/ask", json=request_data)
        
        # Verify response
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        
        # Should contain streaming data
        content = response.text
        assert "data:" in content
        assert '"message":{"content":"Simple"}' in content
        assert '"done":true' in content
    
    def test_streaming_error_handling(self):
        """Test error handling in streaming endpoint."""
        # Test with invalid request
        request_data = {
            "stream": True
            # Missing required fields
        }
        
        response = self.client.post("/v1/ask", json=request_data)
        
        # Should return error
        assert response.status_code == 400
        assert "Either 'question' or 'messages' is required" in response.json()["detail"]


@pytest.fixture
def mock_ollama_response():
    """Mock Ollama streaming response."""
    return [
        {"response": "Test", "done": False},
        {"response": " response", "done": False},
        {"response": " complete", "done": True}
    ]


class TestStreamingIntegration:
    """Integration tests for complete streaming flow."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_streaming(self, mock_ollama_response):
        """Test complete streaming flow from client to Ollama."""
        client = OllamaClient()
        
        with patch.object(client, 'client') as mock_http_client:
            # Setup mock streaming response
            mock_response = AsyncMock()
            mock_response.raise_for_status = AsyncMock()
            mock_response.aiter_lines = AsyncMock(return_value=[
                json.dumps(chunk) for chunk in mock_ollama_response
            ])
            
            mock_http_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
            mock_http_client.stream.return_value.__aexit__ = AsyncMock(return_value=None)
            
            # Test complete flow
            full_response = ""
            async for chunk in client.generate_stream("test-model", "test prompt"):
                if chunk.get("response"):
                    full_response += chunk["response"]
                if chunk.get("done"):
                    break
            
            # Verify complete response
            assert full_response == "Test response complete"
    
    def test_sse_format_compliance(self):
        """Test that SSE format is compliant with standards."""
        with TestClient(app) as client:
            with patch('app.main.ollama_client') as mock_ollama:
                # Mock streaming response
                async def mock_stream(model, prompt):
                    yield {"response": "test", "done": False}
                    yield {"response": "", "done": True}
                
                mock_ollama.generate_stream = mock_stream
                
                # Test request
                response = client.post("/v1/ask", json={
                    "question": "test",
                    "stream": True
                })
                
                # Verify SSE format
                content = response.text
                lines = content.split('\n')
                
                # Check SSE format compliance
                data_lines = [line for line in lines if line.startswith('data:')]
                assert len(data_lines) >= 2  # At least one data + done
                
                # Verify JSON in data lines
                for line in data_lines:
                    json_str = line[5:].strip()  # Remove 'data: '
                    if json_str:  # Skip empty lines
                        json.loads(json_str)  # Should not raise exception
