"""Tests for RAG embeddings system."""

import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.learning.embeddings import OllamaEmbeddingsClient, EmbeddingsService
from app.learning.vector_store import ChromaVectorStore, VectorDocument
from app.learning.rag_system import RAGSystem

client = TestClient(app)


class TestOllamaEmbeddingsClient:
    """Test Ollama embeddings client."""
    
    @pytest.mark.asyncio
    async def test_generate_embedding_success(self):
        """Test successful embedding generation."""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock successful response
            mock_response = MagicMock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.return_value = {
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5]
            }
            mock_post.return_value = mock_response
            
            embeddings_client = OllamaEmbeddingsClient()
            result = await embeddings_client.generate_embedding("test text")
            
            assert result.embedding == [0.1, 0.2, 0.3, 0.4, 0.5]
            assert result.model == "nomic-embed-text"
            assert result.text == "test text"
            assert result.dimensions == 5
            
            await embeddings_client.close()
    
    @pytest.mark.asyncio
    async def test_generate_embedding_error(self):
        """Test embedding generation error."""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock error response
            mock_response = MagicMock()
            mock_response.raise_for_status.side_effect = Exception("Connection failed")
            mock_post.return_value = mock_response
            
            embeddings_client = OllamaEmbeddingsClient()
            
            with pytest.raises(Exception):
                await embeddings_client.generate_embedding("test text")
            
            await embeddings_client.close()
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batch(self):
        """Test batch embedding generation."""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock successful response
            mock_response = MagicMock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.return_value = {
                "embedding": [0.1, 0.2, 0.3]
            }
            mock_post.return_value = mock_response
            
            embeddings_client = OllamaEmbeddingsClient()
            texts = ["text 1", "text 2", "text 3"]
            results = await embeddings_client.generate_embeddings_batch(texts)
            
            assert len(results) == 3
            for result in results:
                assert result.embedding == [0.1, 0.2, 0.3]
            
            await embeddings_client.close()


class TestChromaVectorStore:
    """Test ChromaDB vector store."""
    
    def test_add_document(self):
        """Test adding a document to vector store."""
        with patch('chromadb.PersistentClient') as mock_client:
            # Mock collection
            mock_collection = MagicMock()
            mock_client.return_value.get_collection.return_value = mock_collection
            
            vector_store = ChromaVectorStore(persist_directory="./test_chroma")
            
            doc_id = vector_store.add_document(
                content="test content",
                metadata={"test": "value"},
                embedding=[0.1, 0.2, 0.3]
            )
            
            assert doc_id is not None
            mock_collection.add.assert_called_once()
    
    def test_search_documents(self):
        """Test searching documents."""
        with patch('chromadb.PersistentClient') as mock_client:
            # Mock collection
            mock_collection = MagicMock()
            mock_collection.query.return_value = {
                'ids': [['doc1', 'doc2']],
                'documents': [['content1', 'content2']],
                'metadatas': [[{'convo_id': 'conv1'}, {'convo_id': 'conv2'}]],
                'distances': [[0.1, 0.2]]
            }
            mock_client.return_value.get_collection.return_value = mock_collection
            
            vector_store = ChromaVectorStore(persist_directory="./test_chroma")
            
            results = vector_store.search(
                query_embedding=[0.1, 0.2, 0.3],
                top_k=2
            )
            
            assert len(results) == 2
            assert results[0].document.content == "content1"
            assert results[0].similarity_score == 0.9  # 1 - 0.1


class TestRAGSystem:
    """Test RAG system integration."""
    
    @pytest.mark.asyncio
    async def test_add_conversation(self):
        """Test adding conversation to RAG system."""
        with patch('app.learning.rag_system.message_crud.get_by_convo_id') as mock_get_messages, \
             patch('app.learning.rag_system.vector_store.collection.get') as mock_get_existing, \
             patch('app.learning.rag_system.embeddings_service.get_embeddings_batch') as mock_embeddings, \
             patch('app.learning.rag_system.vector_store.add_documents_batch') as mock_add_docs:
            
            # Mock database messages
            mock_message = MagicMock()
            mock_message.id = "msg1"
            mock_message.content = "test message"
            mock_message.convo_id = "conv1"
            mock_message.role = "user"
            mock_get_messages.return_value = [mock_message]
            
            # Mock no existing documents
            mock_get_existing.return_value = {'ids': []}
            
            # Mock embeddings
            mock_embedding_result = MagicMock()
            mock_embedding_result.embedding = [0.1, 0.2, 0.3]
            mock_embeddings.return_value = [mock_embedding_result]
            
            rag_system = RAGSystem()
            
            # Mock database session
            mock_db = MagicMock()
            
            await rag_system.add_conversation(mock_db, "conv1")
            
            mock_add_docs.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_search_relevant_context(self):
        """Test searching for relevant context."""
        with patch('app.learning.rag_system.embeddings_service.get_embedding') as mock_get_embedding, \
             patch('app.learning.rag_system.vector_store.search') as mock_search:
            
            # Mock embedding result
            mock_embedding_result = MagicMock()
            mock_embedding_result.embedding = [0.1, 0.2, 0.3]
            mock_get_embedding.return_value = mock_embedding_result
            
            # Mock search result
            mock_search_result = MagicMock()
            mock_search_result.document.content = "relevant content"
            mock_search_result.document.convo_id = "conv1"
            mock_search_result.document.role = "user"
            mock_search_result.similarity_score = 0.8
            mock_search_result.document.id = "doc1"
            mock_search.return_value = [mock_search_result]
            
            rag_system = RAGSystem()
            
            chunks = await rag_system.search_relevant_context("test query")
            
            assert len(chunks) == 1
            assert chunks[0].content == "relevant content"
            assert chunks[0].relevance_score == 0.8
    
    def test_split_text_into_chunks(self):
        """Test text chunking functionality."""
        rag_system = RAGSystem()
        
        # Test short text
        short_text = "Short text"
        chunks = rag_system._split_text_into_chunks(short_text)
        assert len(chunks) == 1
        assert chunks[0] == short_text
        
        # Test long text
        long_text = "This is a very long text that should be split into multiple chunks. " * 20
        chunks = rag_system._split_text_into_chunks(long_text)
        assert len(chunks) > 1
        
        # Verify all chunks are within size limit
        for chunk in chunks:
            assert len(chunk) <= rag_system.chunk_size + 50  # Allow some flexibility


class TestRAGAPI:
    """Test RAG API endpoints."""
    
    def test_get_rag_stats(self):
        """Test RAG stats endpoint."""
        with patch('app.api.v1.learning_routes.rag_system.get_stats') as mock_stats:
            mock_stats.return_value = {
                "vector_store": {"total_documents": 10},
                "embeddings_cache": {"cached_embeddings": 5}
            }
            
            response = client.get("/v1/learning/rag/stats")
            assert response.status_code == 200
            data = response.json()
            assert "vector_store" in data
            assert "embeddings_cache" in data
    
    def test_add_conversation_to_rag(self):
        """Test adding conversation to RAG."""
        with patch('app.api.v1.learning_routes.rag_system.add_conversation') as mock_add:
            mock_add.return_value = None
            
            response = client.post("/v1/learning/rag/add-conversation?convo_id=test123")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "test123" in data["message"]
    
    def test_search_rag_context(self):
        """Test searching RAG context."""
        with patch('app.api.v1.learning_routes.rag_system.search_relevant_context') as mock_search:
            mock_chunk = MagicMock()
            mock_chunk.content = "test content"
            mock_chunk.convo_id = "conv1"
            mock_chunk.role = "user"
            mock_chunk.relevance_score = 0.8
            mock_chunk.document_id = "doc1"
            mock_search.return_value = [mock_chunk]
            
            response = client.get("/v1/learning/rag/search?query=test")
            assert response.status_code == 200
            data = response.json()
            assert "query" in data
            assert "results" in data
            assert len(data["results"]) == 1
