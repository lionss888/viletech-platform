"""Embeddings service for RAG system using Ollama API."""

import asyncio
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import httpx
import numpy as np

from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class EmbeddingResult:
    """Result of embedding generation."""
    embedding: List[float]
    model: str
    text: str
    dimensions: int


class OllamaEmbeddingsClient:
    """Client for generating embeddings using Ollama API."""
    
    def __init__(self, host: str = None, model: str = "nomic-embed-text"):
        self.host = host or settings.ollama_host
        self.model = model
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def generate_embedding(self, text: str) -> EmbeddingResult:
        """Generate embedding for a single text."""
        try:
            payload = {
                "model": self.model,
                "prompt": text
            }
            
            response = await self.client.post(
                f"{self.host}/api/embeddings",
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()
            
            if "embedding" not in data:
                raise ValueError(f"No embedding in response: {data}")
            
            embedding = data["embedding"]
            dimensions = len(embedding)
            
            logger.debug(f"Generated embedding with {dimensions} dimensions for text: {text[:50]}...")
            
            return EmbeddingResult(
                embedding=embedding,
                model=self.model,
                text=text,
                dimensions=dimensions
            )
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error generating embedding: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[EmbeddingResult]:
        """Generate embeddings for multiple texts."""
        try:
            # Process in parallel with semaphore to limit concurrent requests
            semaphore = asyncio.Semaphore(5)  # Limit to 5 concurrent requests
            
            async def generate_with_semaphore(text: str) -> EmbeddingResult:
                async with semaphore:
                    return await self.generate_embedding(text)
            
            tasks = [generate_with_semaphore(text) for text in texts]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and log them
            valid_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to generate embedding for text {i}: {str(result)}")
                else:
                    valid_results.append(result)
            
            logger.info(f"Generated {len(valid_results)}/{len(texts)} embeddings successfully")
            return valid_results
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Ollama embeddings API."""
        try:
            # Test with a simple text
            result = await self.generate_embedding("test")
            
            return {
                "ok": True,
                "host": self.host,
                "model": self.model,
                "dimensions": result.dimensions,
                "latency_ms": 0  # Could be measured if needed
            }
            
        except Exception as e:
            return {
                "ok": False,
                "host": self.host,
                "model": self.model,
                "error": str(e)
            }


class EmbeddingsService:
    """Service for managing embeddings with caching and batch processing."""
    
    def __init__(self, client: OllamaEmbeddingsClient = None):
        self.client = client or OllamaEmbeddingsClient()
        self._cache: Dict[str, EmbeddingResult] = {}
    
    async def get_embedding(self, text: str, use_cache: bool = True) -> EmbeddingResult:
        """Get embedding for text with optional caching."""
        # Create cache key
        cache_key = f"{self.client.model}:{hash(text)}"
        
        if use_cache and cache_key in self._cache:
            logger.debug(f"Using cached embedding for text: {text[:50]}...")
            return self._cache[cache_key]
        
        # Generate new embedding
        result = await self.client.generate_embedding(text)
        
        # Cache the result
        if use_cache:
            self._cache[cache_key] = result
        
        return result
    
    async def get_embeddings_batch(self, texts: List[str], use_cache: bool = True) -> List[EmbeddingResult]:
        """Get embeddings for multiple texts with caching."""
        results = []
        texts_to_generate = []
        indices_to_generate = []
        
        # Check cache first
        for i, text in enumerate(texts):
            cache_key = f"{self.client.model}:{hash(text)}"
            if use_cache and cache_key in self._cache:
                results.append(self._cache[cache_key])
            else:
                results.append(None)  # Placeholder
                texts_to_generate.append(text)
                indices_to_generate.append(i)
        
        # Generate missing embeddings
        if texts_to_generate:
            new_embeddings = await self.client.generate_embeddings_batch(texts_to_generate)
            
            # Update results and cache
            for i, embedding in enumerate(new_embeddings):
                original_index = indices_to_generate[i]
                results[original_index] = embedding
                
                if use_cache:
                    cache_key = f"{self.client.model}:{hash(texts_to_generate[i])}"
                    self._cache[cache_key] = embedding
        
        return results
    
    def clear_cache(self):
        """Clear the embeddings cache."""
        self._cache.clear()
        logger.info("Embeddings cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "cached_embeddings": len(self._cache),
            "model": self.client.model,
            "host": self.client.host
        }
    
    async def close(self):
        """Close the embeddings service."""
        await self.client.close()


# Global embeddings service instance
embeddings_service = EmbeddingsService()


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    try:
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {str(e)}")
        return 0.0


def euclidean_distance(vec1: List[float], vec2: List[float]) -> float:
    """Calculate euclidean distance between two vectors."""
    try:
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        return np.linalg.norm(vec1 - vec2)
    except Exception as e:
        logger.error(f"Error calculating euclidean distance: {str(e)}")
        return float('inf')
