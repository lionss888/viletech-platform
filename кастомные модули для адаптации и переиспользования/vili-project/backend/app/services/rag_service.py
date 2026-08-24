"""RAG (Retrieval-Augmented Generation) service"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.exceptions import RAGException
from app.services.embedding_service import EmbeddingService


class RAGService:
    """Сервис для RAG поиска по базе знаний"""
    
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()
        self.top_k = settings.RAG_TOP_K
        self.min_similarity = settings.RAG_MIN_SIMILARITY
    
    async def search_knowledge(
        self,
        query: str,
        source_ids: Optional[List[UUID]] = None,
        top_k: Optional[int] = None,
        min_similarity: Optional[float] = None,
        user_id: Optional[UUID] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Поиск похожих фрагментов знаний через векторный поиск
        
        Args:
            query: Поисковый запрос
            source_ids: Фильтр по ID источников
            top_k: Количество результатов
            min_similarity: Минимальная схожесть
            user_id: ID пользователя для доступа к owner_only контенту
            category: Фильтр по категории знаний
        
        Returns:
            List[Dict]: Список найденных фрагментов с метаданными
        """
        if not query or not query.strip():
            raise RAGException("Empty query provided")
        
        try:
            # Генерируем embedding для запроса
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Параметры поиска
            k = top_k or self.top_k
            min_sim = min_similarity or self.min_similarity
            
            # Вызываем SQL функцию поиска с расширенными параметрами
            sql_query = text("""
                SELECT 
                    id,
                    source_id,
                    source_name,
                    content,
                    content_type,
                    metadata,
                    similarity,
                    category
                FROM search_similar_knowledge(
                    :query_embedding,
                    :match_source_ids,
                    :match_limit,
                    :min_similarity,
                    :match_user_id,
                    :match_category
                )
            """)
            
            # Преобразуем UUIDs в массив PostgreSQL
            source_ids_array = f"{{{','.join([str(sid) for sid in source_ids])}}}" if source_ids else None
            
            result = self.db.execute(
                sql_query,
                {
                    "query_embedding": str(query_embedding),
                    "match_source_ids": source_ids_array,
                    "match_limit": k,
                    "min_similarity": min_sim,
                    "match_user_id": str(user_id) if user_id else None,
                    "match_category": category
                }
            )
            
            rows = result.fetchall()
            
            # Форматируем результаты
            results = []
            for row in rows:
                results.append({
                    "id": str(row.id),
                    "source_id": str(row.source_id),
                    "source_name": row.source_name,
                    "content": row.content,
                    "content_type": row.content_type,
                    "metadata": row.metadata,
                    "similarity": float(row.similarity),
                    "category": row.category
                })
            
            return results
        except Exception as e:
            raise RAGException(
                f"Failed to search knowledge: {str(e)}",
                details={"query": query, "error": str(e)}
            )
    
    async def get_context_for_query(
        self,
        query: str,
        max_chunks: int = 5,
        source_ids: Optional[List[UUID]] = None,
        user_id: Optional[UUID] = None,
        category: Optional[str] = None
    ) -> str:
        """
        Получить контекст для LLM промпта на основе поиска
        
        Args:
            query: Запрос
            max_chunks: Максимальное количество фрагментов
            source_ids: Фильтр по источникам
            user_id: ID пользователя для доступа к owner_only контенту
            category: Фильтр по категории знаний
        
        Returns:
            str: Форматированный контекст
        """
        results = await self.search_knowledge(
            query=query,
            source_ids=source_ids,
            top_k=max_chunks,
            user_id=user_id,
            category=category
        )
        
        if not results:
            return "Нет релевантной информации в базе знаний."
        
        # Форматируем контекст
        context_parts = []
        for i, result in enumerate(results, 1):
            source_name = result.get("source_name", "Unknown")
            content = result.get("content", "")
            similarity = result.get("similarity", 0)
            category_info = f" [{result.get('category')}]" if result.get("category") else ""
            
            context_parts.append(
                f"[Источник {i}: {source_name}{category_info} (релевантность: {similarity:.2%})]\n{content}"
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    async def search_compliance_knowledge(
        self,
        query: str,
        category: Optional[str] = None,
        content_type: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Поиск в compliance_knowledge_base (старая таблица)
        
        Args:
            query: Поисковый запрос
            category: Категория compliance
            content_type: Тип контента
            top_k: Количество результатов
        
        Returns:
            List[Dict]: Найденные результаты
        """
        try:
            # Генерируем embedding
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Вызываем функцию поиска
            sql_query = text("""
                SELECT 
                    id,
                    category,
                    content_type,
                    content,
                    similarity
                FROM search_similar_compliance(
                    :query_embedding,
                    :match_category,
                    :match_type,
                    :match_limit
                )
            """)
            
            result = self.db.execute(
                sql_query,
                {
                    "query_embedding": str(query_embedding),
                    "match_category": category,
                    "match_type": content_type,
                    "match_limit": top_k
                }
            )
            
            rows = result.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "id": str(row.id),
                    "category": row.category,
                    "content_type": row.content_type,
                    "content": row.content,
                    "similarity": float(row.similarity)
                })
            
            return results
        except Exception as e:
            raise RAGException(
                f"Failed to search compliance knowledge: {str(e)}",
                details={"query": query, "error": str(e)}
            )
