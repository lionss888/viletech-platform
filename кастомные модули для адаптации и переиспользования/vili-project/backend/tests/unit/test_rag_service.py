"""Unit tests for RAG Service"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from app.services.rag_service import RAGService
from app.core.exceptions import RAGException


@pytest.mark.unit
class TestRAGService:
    """Tests for the RAG Service"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        return MagicMock()
    
    @pytest.fixture
    def rag_service(self, mock_db_session, monkeypatch):
        """Create a RAG service with mocked dependencies.
        
        Note: Using monkeypatch instead of patch() context manager
        to ensure the mock stays active throughout the test execution.
        The patch() context manager would exit after returning the service,
        leaving the settings unmocked during actual test execution.
        """
        # Create a mock settings object
        mock_settings = MagicMock()
        mock_settings.RAG_TOP_K = 5
        mock_settings.RAG_MIN_SIMILARITY = 0.7
        mock_settings.LITELLM_URL = "http://localhost:4000"
        mock_settings.OLLAMA_URL = "http://localhost:11434"
        mock_settings.EMBEDDING_MODEL = "nomic-embed-text"
        mock_settings.EMBEDDING_DIMENSION = 768
        
        # Patch settings at module level using monkeypatch
        monkeypatch.setattr('app.services.rag_service.settings', mock_settings)
        
        # Create and return the service (monkeypatch persists for the test)
        service = RAGService(mock_db_session)
        return service
    
    @pytest.fixture
    def sample_search_results(self):
        """Sample search results from database."""
        class MockRow:
            def __init__(self, id, source_id, source_name, content, content_type, metadata, similarity):
                self.id = id
                self.source_id = source_id
                self.source_name = source_name
                self.content = content
                self.content_type = content_type
                self.metadata = metadata
                self.similarity = similarity
        
        return [
            MockRow(
                id=UUID("550e8400-e29b-41d4-a716-446655440001"),
                source_id=UUID("550e8400-e29b-41d4-a716-446655440010"),
                source_name="Compliance Rules",
                content="OFAC sanctions require screening all parties.",
                content_type="regulation",
                metadata={"category": "sanctions"},
                similarity=0.95
            ),
            MockRow(
                id=UUID("550e8400-e29b-41d4-a716-446655440002"),
                source_id=UUID("550e8400-e29b-41d4-a716-446655440010"),
                source_name="Compliance Rules",
                content="AML threshold is $10,000 for CTR.",
                content_type="guideline",
                metadata={"category": "aml"},
                similarity=0.85
            )
        ]
    
    # ============================================
    # Test search_knowledge method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_search_knowledge_success(self, rag_service, mock_db_session, sample_search_results):
        """Test successful knowledge search."""
        # Mock embedding service
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            # Mock database query
            mock_result = MagicMock()
            mock_result.fetchall.return_value = sample_search_results
            mock_db_session.execute.return_value = mock_result
            
            results = await rag_service.search_knowledge("What are sanctions rules?")
            
            assert len(results) == 2
            assert results[0]["content"] == "OFAC sanctions require screening all parties."
            assert results[0]["similarity"] == 0.95
            mock_embed.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_search_knowledge_empty_query_raises_exception(self, rag_service):
        """Test that empty query raises RAGException."""
        with pytest.raises(RAGException) as exc_info:
            await rag_service.search_knowledge("")
        
        assert "Empty query" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_search_knowledge_whitespace_query_raises_exception(self, rag_service):
        """Test that whitespace-only query raises RAGException."""
        with pytest.raises(RAGException) as exc_info:
            await rag_service.search_knowledge("   ")
        
        assert "Empty query" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_search_knowledge_with_source_filter(self, rag_service, mock_db_session, sample_search_results):
        """Test knowledge search with source ID filter."""
        source_id = UUID("550e8400-e29b-41d4-a716-446655440010")
        
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = sample_search_results
            mock_db_session.execute.return_value = mock_result
            
            results = await rag_service.search_knowledge(
                "What are sanctions rules?",
                source_ids=[source_id]
            )
            
            # Verify the query included source_ids
            call_args = mock_db_session.execute.call_args
            params = call_args[0][1]
            assert str(source_id) in params["match_source_ids"]
    
    @pytest.mark.asyncio
    async def test_search_knowledge_with_custom_top_k(self, rag_service, mock_db_session):
        """Test knowledge search with custom top_k."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_db_session.execute.return_value = mock_result
            
            await rag_service.search_knowledge("Query", top_k=10)
            
            call_args = mock_db_session.execute.call_args
            params = call_args[0][1]
            assert params["match_limit"] == 10
    
    @pytest.mark.asyncio
    async def test_search_knowledge_database_error(self, rag_service, mock_db_session):
        """Test handling of database errors."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            mock_db_session.execute.side_effect = Exception("Database connection failed")
            
            with pytest.raises(RAGException) as exc_info:
                await rag_service.search_knowledge("Query")
            
            assert "Failed to search knowledge" in str(exc_info.value)
    
    # ============================================
    # Test get_context_for_query method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_get_context_for_query_success(self, rag_service, mock_db_session, sample_search_results):
        """Test successful context retrieval."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = sample_search_results
            mock_db_session.execute.return_value = mock_result
            
            context = await rag_service.get_context_for_query("What are sanctions?")
            
            assert "OFAC sanctions" in context
            assert "AML threshold" in context
            assert "Compliance Rules" in context
            assert "95" in context  # Similarity percentage
    
    @pytest.mark.asyncio
    async def test_get_context_for_query_no_results(self, rag_service, mock_db_session):
        """Test context retrieval when no results found."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_db_session.execute.return_value = mock_result
            
            context = await rag_service.get_context_for_query("Unknown topic")
            
            assert "Нет релевантной информации" in context
    
    @pytest.mark.asyncio
    async def test_get_context_for_query_respects_max_chunks(self, rag_service, mock_db_session):
        """Test that max_chunks parameter is respected."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_db_session.execute.return_value = mock_result
            
            await rag_service.get_context_for_query("Query", max_chunks=3)
            
            call_args = mock_db_session.execute.call_args
            params = call_args[0][1]
            assert params["match_limit"] == 3
    
    # ============================================
    # Test search_compliance_knowledge method
    # ============================================
    
    @pytest.mark.asyncio
    async def test_search_compliance_knowledge_success(self, rag_service, mock_db_session):
        """Test successful compliance knowledge search."""
        class MockComplianceRow:
            def __init__(self, id, category, content_type, content, similarity):
                self.id = id
                self.category = category
                self.content_type = content_type
                self.content = content
                self.similarity = similarity
        
        mock_rows = [
            MockComplianceRow(
                id=UUID("550e8400-e29b-41d4-a716-446655440001"),
                category="sanctions",
                content_type="regulation",
                content="Sanctions compliance rule",
                similarity=0.9
            )
        ]
        
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = mock_rows
            mock_db_session.execute.return_value = mock_result
            
            results = await rag_service.search_compliance_knowledge(
                query="sanctions",
                category="sanctions",
                content_type="regulation"
            )
            
            assert len(results) == 1
            assert results[0]["category"] == "sanctions"
            assert results[0]["similarity"] == 0.9
    
    @pytest.mark.asyncio
    async def test_search_compliance_knowledge_with_filters(self, rag_service, mock_db_session):
        """Test compliance knowledge search with category and type filters."""
        with patch.object(
            rag_service.embedding_service, 
            'generate_embedding', 
            new_callable=AsyncMock
        ) as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_db_session.execute.return_value = mock_result
            
            await rag_service.search_compliance_knowledge(
                query="test",
                category="aml",
                content_type="guideline",
                top_k=10
            )
            
            call_args = mock_db_session.execute.call_args
            params = call_args[0][1]
            assert params["match_category"] == "aml"
            assert params["match_type"] == "guideline"
            assert params["match_limit"] == 10
