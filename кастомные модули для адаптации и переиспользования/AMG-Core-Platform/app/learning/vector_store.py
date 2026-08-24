"""Vector store for RAG system using ChromaDB."""

import json
import uuid
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import chromadb
from chromadb.config import Settings

from app.learning.embeddings import EmbeddingResult, cosine_similarity
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class VectorDocument:
    """Document stored in vector database."""
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    convo_id: Optional[str] = None
    role: Optional[str] = None


@dataclass
class SearchResult:
    """Search result from vector store."""
    document: VectorDocument
    similarity_score: float
    distance: float


class ChromaVectorStore:
    """Vector store implementation using ChromaDB."""
    
    def __init__(self, persist_directory: str = "./data/chroma", collection_name: str = "rag_documents"):
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        self.collection_name = collection_name
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        try:
            self.collection = self.client.get_collection(name=collection_name)
            logger.info(f"Loaded existing collection: {collection_name}")
        except Exception:
            self.collection = self.client.create_collection(
                name=collection_name,
                metadata={"description": "RAG documents collection"}
            )
            logger.info(f"Created new collection: {collection_name}")
    
    def add_document(
        self, 
        content: str, 
        metadata: Dict[str, Any] = None,
        document_id: str = None,
        embedding: List[float] = None
    ) -> str:
        """Add a document to the vector store."""
        try:
            doc_id = document_id or str(uuid.uuid4())
            metadata = metadata or {}
            
            # Prepare metadata for ChromaDB
            chroma_metadata = {
                "content": content,
                **metadata
            }
            
            # Add to collection
            self.collection.add(
                documents=[content],
                metadatas=[chroma_metadata],
                ids=[doc_id],
                embeddings=[embedding] if embedding else None
            )
            
            logger.debug(f"Added document {doc_id} to vector store")
            return doc_id
            
        except Exception as e:
            logger.error(f"Error adding document to vector store: {str(e)}")
            raise
    
    def add_documents_batch(
        self, 
        documents: List[VectorDocument]
    ) -> List[str]:
        """Add multiple documents to the vector store."""
        try:
            ids = []
            contents = []
            metadatas = []
            embeddings = []
            
            for doc in documents:
                doc_id = doc.id or str(uuid.uuid4())
                ids.append(doc_id)
                contents.append(doc.content)
                
                metadata = {
                    "content": doc.content,
                    **doc.metadata
                }
                if doc.convo_id:
                    metadata["convo_id"] = doc.convo_id
                if doc.role:
                    metadata["role"] = doc.role
                
                metadatas.append(metadata)
                
                if doc.embedding:
                    embeddings.append(doc.embedding)
                else:
                    embeddings.append(None)
            
            # Filter out None embeddings
            if all(emb is None for emb in embeddings):
                embeddings = None
            
            self.collection.add(
                documents=contents,
                metadatas=metadatas,
                ids=ids,
                embeddings=embeddings
            )
            
            logger.info(f"Added {len(documents)} documents to vector store")
            return ids
            
        except Exception as e:
            logger.error(f"Error adding documents batch to vector store: {str(e)}")
            raise
    
    def search(
        self, 
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Dict[str, Any] = None
    ) -> List[SearchResult]:
        """Search for similar documents."""
        try:
            # Prepare where clause for filtering
            where_clause = None
            if filter_metadata:
                where_clause = filter_metadata
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause
            )
            
            # Convert to SearchResult objects
            search_results = []
            
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    doc_id = results['ids'][0][i]
                    content = results['documents'][0][i]
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i] if results['distances'] else 0.0
                    
                    # Calculate similarity score (1 - distance for cosine distance)
                    similarity_score = 1.0 - distance
                    
                    document = VectorDocument(
                        id=doc_id,
                        content=content,
                        metadata=metadata,
                        convo_id=metadata.get('convo_id'),
                        role=metadata.get('role')
                    )
                    
                    search_results.append(SearchResult(
                        document=document,
                        similarity_score=similarity_score,
                        distance=distance
                    ))
            
            logger.debug(f"Found {len(search_results)} similar documents")
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {str(e)}")
            raise
    
    async def search_by_text(
        self, 
        query_text: str,
        top_k: int = 5,
        filter_metadata: Dict[str, Any] = None
    ) -> List[SearchResult]:
        """Search for similar documents by text (requires embeddings service)."""
        try:
            from app.learning.embeddings import embeddings_service
            
            # Generate embedding for query text
            embedding_result = await embeddings_service.get_embedding(query_text)
            
            # Search using embedding
            return self.search(
                query_embedding=embedding_result.embedding,
                top_k=top_k,
                filter_metadata=filter_metadata
            )
            
        except Exception as e:
            logger.error(f"Error searching by text: {str(e)}")
            raise
    
    def get_document(self, document_id: str) -> Optional[VectorDocument]:
        """Get a document by ID."""
        try:
            results = self.collection.get(ids=[document_id])
            
            if not results['ids']:
                return None
            
            content = results['documents'][0]
            metadata = results['metadatas'][0]
            
            return VectorDocument(
                id=document_id,
                content=content,
                metadata=metadata,
                convo_id=metadata.get('convo_id'),
                role=metadata.get('role')
            )
            
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {str(e)}")
            return None
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document by ID."""
        try:
            self.collection.delete(ids=[document_id])
            logger.debug(f"Deleted document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            return False
    
    def delete_documents_by_conversation(self, convo_id: str) -> int:
        """Delete all documents from a specific conversation."""
        try:
            # Get all documents for this conversation
            results = self.collection.get(
                where={"convo_id": convo_id}
            )
            
            if not results['ids']:
                return 0
            
            # Delete all documents
            self.collection.delete(ids=results['ids'])
            
            deleted_count = len(results['ids'])
            logger.info(f"Deleted {deleted_count} documents for conversation {convo_id}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting documents for conversation {convo_id}: {str(e)}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        try:
            count = self.collection.count()
            
            return {
                "total_documents": count,
                "collection_name": self.collection_name,
                "persist_directory": str(self.persist_directory)
            }
            
        except Exception as e:
            logger.error(f"Error getting vector store stats: {str(e)}")
            return {"error": str(e)}
    
    def reset_collection(self) -> bool:
        """Reset the entire collection (delete all documents)."""
        try:
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "RAG documents collection"}
            )
            logger.info(f"Reset collection: {self.collection_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting collection: {str(e)}")
            return False


# Global vector store instance
vector_store = ChromaVectorStore()
