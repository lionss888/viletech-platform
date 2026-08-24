"""RAG (Retrieval-Augmented Generation) system for learning from conversations."""

import json
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.db.models import Message
from app.db.crud import message_crud
from app.learning.embeddings import embeddings_service, EmbeddingResult
from app.learning.vector_store import vector_store, VectorDocument, SearchResult
from app.prompts import get_context_aware_prompt, create_enhanced_system_prompt
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ContextChunk:
    """A chunk of context for RAG."""
    content: str
    convo_id: str
    role: str
    created_at: str
    relevance_score: float = 0.0
    document_id: Optional[str] = None


class RAGSystem:
    """RAG system for learning from conversation history."""
    
    def __init__(self):
        self.embeddings_service = embeddings_service
        self.vector_store = vector_store
        self.chunk_size = 500  # Characters per chunk
        self.chunk_overlap = 50  # Overlap between chunks
    
    async def add_conversation(self, db: Session, convo_id: str, limit: int = 100):
        """Add conversation to RAG system."""
        try:
            # Get conversation messages
            messages = message_crud.get_by_convo_id(db, convo_id, limit=limit)
            
            if not messages:
                logger.warning(f"No messages found for conversation {convo_id}")
                return
            
            # Check if conversation already exists in vector store
            existing_docs = self.vector_store.collection.get(
                where={"convo_id": convo_id}
            )
            if existing_docs['ids']:
                logger.info(f"Conversation {convo_id} already exists in vector store, skipping")
                return
            
            # Prepare documents for vector store
            documents = []
            texts_to_embed = []
            
            for message in messages:
                # Split long messages into chunks
                chunks = self._split_text_into_chunks(message.content)
                
                for i, chunk_content in enumerate(chunks):
                    doc_id = f"{message.id}_{i}"
                    
                    document = VectorDocument(
                        id=doc_id,
                        content=chunk_content,
                        metadata={
                            "message_id": str(message.id),
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                            "original_length": len(message.content)
                        },
                        convo_id=message.convo_id,
                        role=message.role
                    )
                    
                    documents.append(document)
                    texts_to_embed.append(chunk_content)
            
            # Generate embeddings for all chunks
            logger.info(f"Generating embeddings for {len(texts_to_embed)} chunks...")
            embedding_results = await self.embeddings_service.get_embeddings_batch(texts_to_embed)
            
            # Add embeddings to documents
            for i, embedding_result in enumerate(embedding_results):
                documents[i].embedding = embedding_result.embedding
            
            # Add documents to vector store
            self.vector_store.add_documents_batch(documents)
            
            logger.info(f"Added {len(documents)} chunks from {len(messages)} messages in conversation {convo_id}")
            
        except Exception as e:
            logger.error(f"Failed to add conversation {convo_id}: {str(e)}")
            raise
    
    async def search_relevant_context(
        self, 
        query: str, 
        top_k: int = 5,
        min_relevance: float = 0.7,
        filter_convo_id: Optional[str] = None
    ) -> List[ContextChunk]:
        """Search for relevant context chunks."""
        try:
            # Generate embedding for query
            query_embedding_result = await self.embeddings_service.get_embedding(query)
            query_embedding = query_embedding_result.embedding
            
            # Prepare filter metadata
            filter_metadata = None
            if filter_convo_id:
                filter_metadata = {"convo_id": filter_convo_id}
            
            # Search in vector store
            search_results = self.vector_store.search(
                query_embedding=query_embedding,
                top_k=top_k,
                filter_metadata=filter_metadata
            )
            
            # Convert to ContextChunk objects
            context_chunks = []
            for result in search_results:
                if result.similarity_score >= min_relevance:
                    chunk = ContextChunk(
                        content=result.document.content,
                        convo_id=result.document.convo_id or "",
                        role=result.document.role or "unknown",
                        created_at="",  # Could be added to metadata
                        relevance_score=result.similarity_score,
                        document_id=result.document.id
                    )
                    context_chunks.append(chunk)
            
            logger.debug(f"Found {len(context_chunks)} relevant chunks for query: {query[:50]}...")
            return context_chunks
            
        except Exception as e:
            logger.error(f"Failed to search relevant context: {str(e)}")
            return []
    
    async def get_enhanced_prompt(
        self, 
        original_messages: List[Dict[str, str]], 
        query: str,
        use_smart_prompts: bool = True
    ) -> List[Dict[str, str]]:
        """Get enhanced prompt with relevant context and smart prompts."""
        try:
            # 1. Находим релевантный контекст через RAG
            relevant_chunks = await self.search_relevant_context(query)
            
            # 2. Определяем тип разговора и получаем умный промт
            if use_smart_prompts:
                base_prompt = get_context_aware_prompt(original_messages, query)
                logger.debug("Using smart context-aware prompt")
            else:
                from app.prompts import get_system_prompt
                base_prompt = get_system_prompt("default")
                logger.debug("Using default prompt")
            
            # 3. Создаем улучшенный промт с RAG контекстом
            if relevant_chunks:
                # Конвертируем ContextChunk в формат для промта
                context_data = []
                for chunk in relevant_chunks:
                    context_data.append({
                        "content": chunk.content,
                        "role": chunk.role,
                        "relevance_score": chunk.relevance_score,
                        "convo_id": chunk.convo_id
                    })
                
                enhanced_system_prompt = create_enhanced_system_prompt(
                    base_prompt, 
                    context_data, 
                    "conversation"
                )
                logger.debug(f"Enhanced prompt with {len(relevant_chunks)} context chunks")
            else:
                enhanced_system_prompt = base_prompt
                logger.debug("No relevant context found, using base prompt only")
            
            # 4. Возвращаем сообщения с улучшенным промтом
            enhanced_messages = [{"role": "system", "content": enhanced_system_prompt}]
            enhanced_messages.extend(original_messages)
            
            return enhanced_messages
            
        except Exception as e:
            logger.error(f"Error creating enhanced prompt: {str(e)}")
            # Fallback to original messages if enhancement fails
            return original_messages
    
    def _split_text_into_chunks(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            
            # Try to break at word boundary
            if end < len(text):
                # Find last space before end
                last_space = text.rfind(' ', start, end)
                if last_space > start:
                    end = last_space
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - self.chunk_overlap
            if start >= len(text):
                break
        
        return chunks
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics."""
        try:
            vector_stats = self.vector_store.get_stats()
            embeddings_stats = self.embeddings_service.get_cache_stats()
            
            return {
                "vector_store": vector_stats,
                "embeddings_cache": embeddings_stats,
                "chunk_size": self.chunk_size,
                "chunk_overlap": self.chunk_overlap
            }
        except Exception as e:
            logger.error(f"Error getting RAG stats: {str(e)}")
            return {"error": str(e)}
    
    async def delete_conversation(self, convo_id: str) -> bool:
        """Delete all documents for a conversation."""
        try:
            deleted_count = self.vector_store.delete_documents_by_conversation(convo_id)
            logger.info(f"Deleted {deleted_count} documents for conversation {convo_id}")
            return deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting conversation {convo_id}: {str(e)}")
            return False
    
    async def reset_system(self) -> bool:
        """Reset the entire RAG system."""
        try:
            # Clear embeddings cache
            self.embeddings_service.clear_cache()
            
            # Reset vector store
            success = self.vector_store.reset_collection()
            
            logger.info("RAG system reset successfully")
            return success
        except Exception as e:
            logger.error(f"Error resetting RAG system: {str(e)}")
            return False


# Global RAG instance
rag_system = RAGSystem()
