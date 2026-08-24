"""Embedding service for generating vector embeddings"""

import httpx
from typing import List, Optional
import numpy as np

from app.core.config import settings
from app.core.exceptions import LLMException


class EmbeddingService:
    """Сервис для генерации embeddings через LiteLLM/Ollama"""
    
    def __init__(self):
        self.litellm_url = settings.LITELLM_URL
        self.ollama_url = settings.OLLAMA_URL
        self.embedding_model = settings.EMBEDDING_MODEL
        self.embedding_dimension = settings.EMBEDDING_DIMENSION
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Генерация embedding для текста
        
        Args:
            text: Текст для embedding
        
        Returns:
            List[float]: Вектор embedding
        """
        if not text or not text.strip():
            raise LLMException("Empty text provided for embedding")
        
        try:
            # Используем Ollama напрямую для embeddings (быстрее чем через LiteLLM)
            return await self._generate_via_ollama(text)
        except Exception as e:
            raise LLMException(
                f"Failed to generate embedding: {str(e)}",
                details={"text_length": len(text), "error": str(e)}
            )
    
    async def generate_embeddings_batch(self, texts: List[str], batch_size: int = 10) -> List[List[float]]:
        """
        Генерация embeddings для списка текстов (батчами)
        
        Args:
            texts: Список текстов
            batch_size: Размер батча
        
        Returns:
            List[List[float]]: Список векторов embeddings
        """
        if not texts:
            return []
        
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            for text in batch:
                embedding = await self.generate_embedding(text)
                embeddings.append(embedding)
        
        return embeddings
    
    async def _generate_via_ollama(self, text: str) -> List[float]:
        """Генерация embedding через Ollama API"""
        url = f"{self.ollama_url}/api/embeddings"
        
        payload = {
            "model": "nomic-embed-text",  # Используем nomic-embed-text
            "prompt": text
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            embedding = data.get("embedding")
            
            if not embedding:
                raise LLMException("No embedding returned from Ollama")
            
            return embedding
    
    async def _generate_via_litellm(self, text: str) -> List[float]:
        """Генерация embedding через LiteLLM API (альтернатива)"""
        url = f"{self.litellm_url}/embeddings"
        
        payload = {
            "model": self.embedding_model,
            "input": text
        }
        
        headers = {
            "Authorization": f"Bearer {settings.LITELLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            embedding = data.get("data", [{}])[0].get("embedding")
            
            if not embedding:
                raise LLMException("No embedding returned from LiteLLM")
            
            return embedding
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Вычисление косинусной схожести между двумя векторами
        
        Args:
            vec1: Первый вектор
            vec2: Второй вектор
        
        Returns:
            float: Косинусная схожесть (0-1)
        """
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
