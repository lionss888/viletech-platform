"""Unit tests for Embedding Service"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.embedding_service import EmbeddingService
from app.core.exceptions import LLMException


@pytest.mark.unit
class TestEmbeddingService:
    """Tests for the Embedding Service"""
    
    @pytest.fixture
    def embedding_service(self, monkeypatch):
        """Create a fresh embedding service for each test.
        
        Note: Using monkeypatch instead of patch() context manager
        to ensure the mock stays active throughout the test execution.
        The patch() context manager would exit after returning the service,
        leaving the settings unmocked during actual test execution.
        """
        # Create a mock settings object
        mock_settings = MagicMock()
        mock_settings.LITELLM_URL = "http://localhost:4000"
        mock_settings.OLLAMA_URL = "http://localhost:11434"
        mock_settings.EMBEDDING_MODEL = "nomic-embed-text"
        mock_settings.EMBEDDING_DIMENSION = 768
        
        # Patch settings at module level using monkeypatch (persists for the test)
        monkeypatch.setattr('app.services.embedding_service.settings', mock_settings)
        
        return EmbeddingService()
    
    @pytest.fixture
    def mock_ollama_embedding_response(self):
        """Standard mock Ollama embedding response."""
        return {
            "embedding": [0.1] * 768
        }
    
    # ============================================
    # Test generate_embedding method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, embedding_service, mock_ollama_embedding_response):
        """Test successful embedding generation."""
        mock_response = MagicMock()
        mock_response.json.return_value = mock_ollama_embedding_response
        mock_response.raise_for_status = MagicMock()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await embedding_service.generate_embedding("Test text")
            
            assert isinstance(result, list)
            assert len(result) == 768
            assert all(isinstance(x, float) for x in result)
    
    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self, embedding_service):
        """Test that empty text raises an exception."""
        with pytest.raises(LLMException) as exc_info:
            await embedding_service.generate_embedding("")
        
        assert "Empty text" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_generate_embedding_whitespace_text(self, embedding_service):
        """Test that whitespace-only text raises an exception."""
        with pytest.raises(LLMException) as exc_info:
            await embedding_service.generate_embedding("   ")
        
        assert "Empty text" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_generate_embedding_http_error(self, embedding_service):
        """Test HTTP error handling."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(
                side_effect=httpx.HTTPError("Connection failed")
            )
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            with pytest.raises(LLMException) as exc_info:
                await embedding_service.generate_embedding("Test text")
            
            assert "Failed to generate embedding" in str(exc_info.value)
    
    # ============================================
    # Test generate_embeddings_batch method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batch(self, embedding_service, mock_ollama_embedding_response):
        """Test batch embedding generation."""
        mock_response = MagicMock()
        mock_response.json.return_value = mock_ollama_embedding_response
        mock_response.raise_for_status = MagicMock()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            texts = ["Text 1", "Text 2", "Text 3"]
            result = await embedding_service.generate_embeddings_batch(texts)
            
            assert isinstance(result, list)
            assert len(result) == 3
            # Each embedding should be called separately via Ollama
            assert mock_client_instance.post.call_count == 3
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_empty_list(self, embedding_service):
        """Test batch embedding with empty list."""
        result = await embedding_service.generate_embeddings_batch([])
        
        assert result == []
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_with_batch_size(self, embedding_service, mock_ollama_embedding_response):
        """Test batch embedding with custom batch size."""
        mock_response = MagicMock()
        mock_response.json.return_value = mock_ollama_embedding_response
        mock_response.raise_for_status = MagicMock()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            texts = ["Text " + str(i) for i in range(15)]
            result = await embedding_service.generate_embeddings_batch(texts, batch_size=5)
            
            assert len(result) == 15
    
    # ============================================
    # Test cosine_similarity method
    # ============================================
    
    def test_cosine_similarity_identical_vectors(self, embedding_service):
        """Test cosine similarity of identical vectors."""
        vec = [1.0, 0.0, 0.0]
        
        similarity = embedding_service.cosine_similarity(vec, vec)
        
        assert abs(similarity - 1.0) < 0.0001
    
    def test_cosine_similarity_orthogonal_vectors(self, embedding_service):
        """Test cosine similarity of orthogonal vectors."""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        
        similarity = embedding_service.cosine_similarity(vec1, vec2)
        
        assert abs(similarity - 0.0) < 0.0001
    
    def test_cosine_similarity_opposite_vectors(self, embedding_service):
        """Test cosine similarity of opposite vectors."""
        vec1 = [1.0, 0.0]
        vec2 = [-1.0, 0.0]
        
        similarity = embedding_service.cosine_similarity(vec1, vec2)
        
        assert abs(similarity - (-1.0)) < 0.0001
    
    def test_cosine_similarity_zero_vector(self, embedding_service):
        """Test cosine similarity with zero vector."""
        vec1 = [1.0, 2.0, 3.0]
        vec2 = [0.0, 0.0, 0.0]
        
        similarity = embedding_service.cosine_similarity(vec1, vec2)
        
        assert similarity == 0.0
    
    def test_cosine_similarity_similar_vectors(self, embedding_service):
        """Test cosine similarity of similar vectors."""
        vec1 = [1.0, 2.0, 3.0]
        vec2 = [2.0, 4.0, 6.0]  # Same direction, different magnitude
        
        similarity = embedding_service.cosine_similarity(vec1, vec2)
        
        assert abs(similarity - 1.0) < 0.0001
