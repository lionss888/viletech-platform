"""Unit tests for LLM Service"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.llm_service import LLMService
from app.core.exceptions import LLMException


@pytest.mark.unit
class TestLLMService:
    """Tests for the LLM Service"""
    
    @pytest.fixture
    def llm_service(self):
        """Create a fresh LLM service for each test."""
        return LLMService()
    
    @pytest.fixture
    def mock_llm_response(self):
        """Standard mock LLM response."""
        return {
            "choices": [{
                "message": {"content": "Test response content"},
                "finish_reason": "stop"
            }],
            "model": "local-llama",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
    
    # ============================================
    # Test complete method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_complete_success(self, llm_service, mock_llm_response):
        """Test successful completion."""
        mock_ollama_response = {
            "content": "Test response content",
            "model": "local-llama",
            "usage": {},
            "finish_reason": "stop"
        }
        
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.return_value = mock_ollama_response
            
            result = await llm_service.complete("Test prompt")
            
            assert result["content"] == "Test response content"
            assert result["model"] == "local-llama"
            assert result["finish_reason"] == "stop"
            mock_ollama.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_complete_with_system_prompt(self, llm_service, mock_llm_response):
        """Test completion with system prompt."""
        mock_ollama_response = {
            "content": "Test response content",
            "model": "local-llama",
            "usage": {},
            "finish_reason": "stop"
        }
        
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.return_value = mock_ollama_response
            
            result = await llm_service.complete(
                prompt="Test prompt",
                system_prompt="You are a helpful assistant"
            )
            
            # Verify the call was made with system prompt
            mock_ollama.assert_called_once()
            call_args = mock_ollama.call_args
            assert call_args[0][0] == "Test prompt"  # prompt
            assert call_args[0][1] == "local-llama"  # model
            assert call_args[0][2] == "You are a helpful assistant"  # system_prompt
    
    @pytest.mark.asyncio
    async def test_complete_empty_prompt_raises_exception(self, llm_service):
        """Test that empty prompt raises LLMException."""
        with pytest.raises(LLMException) as exc_info:
            await llm_service.complete("")
        
        assert "Empty prompt" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_complete_http_error(self, llm_service):
        """Test HTTP error handling."""
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.side_effect = httpx.HTTPError("Connection failed")
            
            # Should fallback to LiteLLM, but we'll patch that too
            with patch('httpx.AsyncClient') as mock_client:
                mock_client_instance = AsyncMock()
                mock_client_instance.post = AsyncMock(
                    side_effect=httpx.HTTPError("Connection failed")
                )
                mock_client.return_value.__aenter__.return_value = mock_client_instance
                
                with pytest.raises(LLMException) as exc_info:
                    await llm_service.complete("Test prompt")
                
                assert "HTTP error" in str(exc_info.value) or "Connection failed" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_complete_with_custom_parameters(self, llm_service, mock_llm_response):
        """Test completion with custom temperature and max_tokens."""
        mock_ollama_response = {
            "content": "Test response content",
            "model": "local-llama",
            "usage": {},
            "finish_reason": "stop"
        }
        
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.return_value = mock_ollama_response
            
            await llm_service.complete(
                prompt="Test",
                temperature=0.3,
                max_tokens=500
            )
            
            # Verify custom parameters were passed
            call_args = mock_ollama.call_args
            assert call_args[0][3] == 0.3  # temperature
            assert call_args[0][4] == 500  # max_tokens
    
    # ============================================
    # Test analyze_with_rag method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_analyze_with_rag(self, llm_service, mock_llm_response):
        """Test RAG-based analysis."""
        mock_ollama_response = {
            "content": "Test response content",
            "model": "local-llama",
            "usage": {},
            "finish_reason": "stop"
        }
        
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.return_value = mock_ollama_response
            
            result = await llm_service.analyze_with_rag(
                query="What is the compliance status?",
                context="Context about compliance rules..."
            )
            
            assert "content" in result
            
            # Verify the prompt contains both query and context
            mock_ollama.assert_called_once()
            call_args = mock_ollama.call_args
            prompt = call_args[0][0]  # prompt parameter (first argument)
            assert "Контекст" in prompt
            assert "Вопрос" in prompt
            assert "What is the compliance status?" in prompt
            assert "Context about compliance rules..." in prompt
    
    @pytest.mark.asyncio
    async def test_analyze_with_rag_custom_instruction(self, llm_service, mock_llm_response):
        """Test RAG analysis with custom instruction."""
        mock_ollama_response = {
            "content": "Test response content",
            "model": "local-llama",
            "usage": {},
            "finish_reason": "stop"
        }
        
        with patch.object(llm_service, '_complete_ollama', new_callable=AsyncMock) as mock_ollama:
            mock_ollama.return_value = mock_ollama_response
            
            await llm_service.analyze_with_rag(
                query="Test query",
                context="Test context",
                instruction="Respond in JSON format"
            )
            
            # Verify custom instruction is in system prompt
            mock_ollama.assert_called_once()
            call_args = mock_ollama.call_args
            system_prompt = call_args[0][2]  # system_prompt parameter (third argument)
            assert system_prompt is not None
            assert "Respond in JSON format" in system_prompt
    
    # ============================================
    # Test generate_embedding method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_generate_embedding(self, llm_service):
        """Test embedding generation."""
        with patch.object(
            llm_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            result = await llm_service.generate_embedding("Test text")
            
            assert len(result) == 768
            mock_embed.assert_called_once_with("Test text")
    
    # ============================================
    # Test stream_complete method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_stream_complete_not_implemented(self, llm_service):
        """Test that streaming is not yet implemented."""
        with pytest.raises(NotImplementedError):
            await llm_service.stream_complete("Test prompt")
