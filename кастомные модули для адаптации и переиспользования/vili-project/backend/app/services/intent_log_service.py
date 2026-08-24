"""Intent Recognition Logging Service.

This module provides functionality for logging intent recognition results
to the database for analysis and pattern optimization.
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.schemas.intent import IntentResult, IntentType
from app.database.schemas.intent_log import (
    IntentLogCreate,
    IntentLogResponse,
    IntentLogList,
    IntentLogStats,
    IntentMatchInfo,
    ResponseType,
    IntentPatternResponse,
    IntentPatternList,
    IntentPatternStats,
)

logger = logging.getLogger(__name__)


class IntentLogService:
    """Сервис логирования распознавания намерений."""
    
    def __init__(self, db: Session):
        """Инициализация сервиса.
        
        Args:
            db: SQLAlchemy сессия
        """
        self.db = db
    
    async def log_detection(
        self,
        intent_result: IntentResult,
        all_matches: Optional[List[tuple]] = None,
        response_type: ResponseType = ResponseType.HANDLER,
        handler_name: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[UUID]:
        """Записывает лог распознавания в БД.
        
        Args:
            intent_result: Результат распознавания
            all_matches: Все совпадения с паттернами [(pattern, confidence), ...]
            response_type: Тип ответа (handler/llm/rag)
            handler_name: Имя обработчика
            processing_time_ms: Время обработки в мс
            user_id: ID пользователя
            session_id: ID сессии
            metadata: Дополнительные метаданные
            
        Returns:
            UUID созданной записи или None при ошибке
        """
        try:
            # Преобразуем all_matches в формат для БД
            matches_data = None
            if all_matches:
                matches_data = [
                    IntentMatchInfo(
                        intent=pattern.intent.value,
                        confidence=conf,
                        priority=pattern.priority
                    ).model_dump()
                    for pattern, conf in all_matches
                ]
            
            # Преобразуем entities в dict
            entities_data = None
            if intent_result.entities:
                entities_data = {
                    entity.type.value: {
                        "value": entity.value,
                        "confidence": entity.confidence,
                        "raw_text": entity.raw_text
                    }
                    for entity in intent_result.entities
                }
            
            # Выполняем INSERT
            query = text("""
                INSERT INTO intent_recognition_logs 
                (message, detected_intent, confidence, all_matches, entities, 
                 response_type, handler_name, processing_time_ms, user_id, session_id, metadata)
                VALUES 
                (:message, :detected_intent, :confidence, :all_matches, :entities,
                 :response_type, :handler_name, :processing_time_ms, :user_id, :session_id, :metadata)
                RETURNING id
            """)
            
            result = self.db.execute(query, {
                "message": intent_result.original_message,
                "detected_intent": intent_result.intent.value,
                "confidence": intent_result.confidence,
                "all_matches": json.dumps(matches_data) if matches_data else None,
                "entities": json.dumps(entities_data) if entities_data else None,
                "response_type": response_type.value,
                "handler_name": handler_name,
                "processing_time_ms": processing_time_ms,
                "user_id": str(user_id) if user_id else None,
                "session_id": str(session_id) if session_id else None,
                "metadata": json.dumps(metadata) if metadata else None,
            })
            
            self.db.commit()
            row = result.fetchone()
            
            if row:
                return row[0]
            return None
            
        except Exception as e:
            logger.error(f"Error logging intent detection: {e}")
            self.db.rollback()
            return None
    
    async def get_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        intent_type: Optional[str] = None,
        min_confidence: Optional[float] = None,
        max_confidence: Optional[float] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> IntentLogList:
        """Получает список логов с фильтрацией.
        
        Args:
            page: Номер страницы
            page_size: Размер страницы
            intent_type: Фильтр по типу намерения
            min_confidence: Минимальная уверенность
            max_confidence: Максимальная уверенность
            start_date: Начало периода
            end_date: Конец периода
            
        Returns:
            IntentLogList со списком логов
        """
        conditions = []
        params = {}
        
        if intent_type:
            conditions.append("detected_intent = :intent_type")
            params["intent_type"] = intent_type
        
        if min_confidence is not None:
            conditions.append("confidence >= :min_confidence")
            params["min_confidence"] = min_confidence
        
        if max_confidence is not None:
            conditions.append("confidence <= :max_confidence")
            params["max_confidence"] = max_confidence
        
        if start_date:
            conditions.append("created_at >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            conditions.append("created_at <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # Получаем общее количество
        count_query = text(f"SELECT COUNT(*) FROM intent_recognition_logs WHERE {where_clause}")
        total = self.db.execute(count_query, params).scalar() or 0
        
        # Получаем записи
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        query = text(f"""
            SELECT id, message, detected_intent, confidence, matched_pattern_id,
                   all_matches, entities, response_type, handler_name, 
                   processing_time_ms, user_id, created_at
            FROM intent_recognition_logs 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        rows = self.db.execute(query, params).fetchall()
        
        items = [
            IntentLogResponse(
                id=row[0],
                message=row[1],
                detected_intent=row[2],
                confidence=row[3],
                matched_pattern_id=row[4],
                all_matches=json.loads(row[5]) if row[5] else None,
                entities=json.loads(row[6]) if row[6] else None,
                response_type=row[7],
                handler_name=row[8],
                processing_time_ms=row[9],
                user_id=row[10],
                created_at=row[11],
            )
            for row in rows
        ]
        
        return IntentLogList(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )
    
    async def get_stats(
        self,
        period_hours: int = 24,
        min_confidence_threshold: float = 0.7,
    ) -> IntentLogStats:
        """Получает статистику логов за период.
        
        Args:
            period_hours: Период в часах
            min_confidence_threshold: Порог низкой уверенности
            
        Returns:
            IntentLogStats со статистикой
        """
        period_start = datetime.now() - timedelta(hours=period_hours)
        period_end = datetime.now()
        
        # Общая статистика
        stats_query = text("""
            SELECT 
                COUNT(*) as total,
                AVG(confidence) as avg_conf,
                SUM(CASE WHEN confidence < :threshold THEN 1 ELSE 0 END) as low_conf
            FROM intent_recognition_logs
            WHERE created_at >= :period_start
        """)
        
        result = self.db.execute(stats_query, {
            "threshold": min_confidence_threshold,
            "period_start": period_start,
        }).fetchone()
        
        total = result[0] or 0
        avg_conf = result[1] or 0.0
        low_conf = result[2] or 0
        
        # Распределение по намерениям
        intent_query = text("""
            SELECT detected_intent, COUNT(*) as cnt
            FROM intent_recognition_logs
            WHERE created_at >= :period_start
            GROUP BY detected_intent
        """)
        
        intent_rows = self.db.execute(intent_query, {"period_start": period_start}).fetchall()
        intent_distribution = {row[0]: row[1] for row in intent_rows}
        
        # Распределение по типу ответа
        response_query = text("""
            SELECT response_type, COUNT(*) as cnt
            FROM intent_recognition_logs
            WHERE created_at >= :period_start AND response_type IS NOT NULL
            GROUP BY response_type
        """)
        
        response_rows = self.db.execute(response_query, {"period_start": period_start}).fetchall()
        response_distribution = {row[0]: row[1] for row in response_rows}
        
        return IntentLogStats(
            total_logs=total,
            avg_confidence=avg_conf,
            low_confidence_count=low_conf,
            intent_distribution=intent_distribution,
            response_type_distribution=response_distribution,
            period_start=period_start,
            period_end=period_end,
        )
    
    async def get_low_confidence_logs(
        self,
        threshold: float = 0.7,
        period_hours: int = 24,
        limit: int = 100,
    ) -> List[IntentLogResponse]:
        """Получает логи с низкой уверенностью для анализа.
        
        Args:
            threshold: Порог уверенности
            period_hours: Период в часах
            limit: Максимальное количество записей
            
        Returns:
            Список логов с низкой уверенностью
        """
        period_start = datetime.now() - timedelta(hours=period_hours)
        
        query = text("""
            SELECT id, message, detected_intent, confidence, matched_pattern_id,
                   all_matches, entities, response_type, handler_name, 
                   processing_time_ms, user_id, created_at
            FROM intent_recognition_logs 
            WHERE confidence < :threshold AND created_at >= :period_start
            ORDER BY confidence ASC, created_at DESC
            LIMIT :limit
        """)
        
        rows = self.db.execute(query, {
            "threshold": threshold,
            "period_start": period_start,
            "limit": limit,
        }).fetchall()
        
        return [
            IntentLogResponse(
                id=row[0],
                message=row[1],
                detected_intent=row[2],
                confidence=row[3],
                matched_pattern_id=row[4],
                all_matches=json.loads(row[5]) if row[5] else None,
                entities=json.loads(row[6]) if row[6] else None,
                response_type=row[7],
                handler_name=row[8],
                processing_time_ms=row[9],
                user_id=row[10],
                created_at=row[11],
            )
            for row in rows
        ]


# Синхронные обертки для использования без async
def log_detection_sync(
    db: Session,
    intent_result: IntentResult,
    all_matches: Optional[List[tuple]] = None,
    response_type: ResponseType = ResponseType.HANDLER,
    handler_name: Optional[str] = None,
    processing_time_ms: Optional[int] = None,
    user_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[UUID]:
    """Синхронная обертка для логирования."""
    import asyncio
    service = IntentLogService(db)
    
    # Проверяем, есть ли event loop
    try:
        loop = asyncio.get_running_loop()
        # Если есть loop, создаем task
        future = asyncio.ensure_future(
            service.log_detection(
                intent_result=intent_result,
                all_matches=all_matches,
                response_type=response_type,
                handler_name=handler_name,
                processing_time_ms=processing_time_ms,
                user_id=user_id,
                session_id=session_id,
                metadata=metadata,
            )
        )
        return None  # Вернет асинхронно
    except RuntimeError:
        # Нет loop, выполняем синхронно
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                service.log_detection(
                    intent_result=intent_result,
                    all_matches=all_matches,
                    response_type=response_type,
                    handler_name=handler_name,
                    processing_time_ms=processing_time_ms,
                    user_id=user_id,
                    session_id=session_id,
                    metadata=metadata,
                )
            )
        finally:
            loop.close()
