"""Pydantic schemas for Intent Recognition Logs and Pattern Management.

This module provides data models for:
- Logging intent recognition results
- Managing dynamic intent patterns
- Pattern improvement suggestions
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from enum import Enum

from app.database.schemas.intent import IntentType


class ResponseType(str, Enum):
    """Тип ответа на запрос"""
    HANDLER = "handler"  # Обработано специализированным хендлером
    LLM = "llm"  # Обработано LLM (обычный чат)
    RAG = "rag"  # Обработано через RAG
    ERROR = "error"  # Ошибка обработки


class ChangeType(str, Enum):
    """Тип изменения паттерна"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    AUTO_OPTIMIZE = "auto_optimize"


class ImprovementStatus(str, Enum):
    """Статус предложения по улучшению"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    APPLIED = "applied"
    AUTO_APPLIED = "auto_applied"


# ============================================
# ЛОГИ РАСПОЗНАВАНИЯ
# ============================================

class IntentMatchInfo(BaseModel):
    """Информация о совпадении с паттерном"""
    intent: str = Field(..., description="Тип намерения")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Уверенность")
    pattern_id: Optional[int] = Field(None, description="ID паттерна в БД")
    priority: int = Field(default=0, description="Приоритет паттерна")


class IntentLogBase(BaseModel):
    """Базовая схема лога распознавания"""
    message: str = Field(..., description="Исходное сообщение пользователя")
    detected_intent: str = Field(..., description="Распознанное намерение")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Уверенность распознавания")


class IntentLogCreate(IntentLogBase):
    """Схема создания лога"""
    matched_pattern_id: Optional[int] = Field(None, description="ID сработавшего паттерна")
    all_matches: Optional[List[IntentMatchInfo]] = Field(None, description="Все совпадения")
    entities: Optional[Dict[str, Any]] = Field(None, description="Извлечённые сущности")
    response_type: ResponseType = Field(default=ResponseType.HANDLER, description="Тип ответа")
    handler_name: Optional[str] = Field(None, description="Имя обработчика")
    processing_time_ms: Optional[int] = Field(None, description="Время обработки (мс)")
    user_id: Optional[UUID] = Field(None, description="ID пользователя")
    session_id: Optional[UUID] = Field(None, description="ID сессии")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Доп. метаданные")


class IntentLogResponse(IntentLogBase):
    """Схема ответа лога"""
    id: UUID = Field(..., description="ID лога")
    matched_pattern_id: Optional[int] = None
    all_matches: Optional[List[IntentMatchInfo]] = None
    entities: Optional[Dict[str, Any]] = None
    response_type: Optional[str] = None
    handler_name: Optional[str] = None
    processing_time_ms: Optional[int] = None
    user_id: Optional[UUID] = None
    created_at: datetime = Field(..., description="Время создания")

    class Config:
        from_attributes = True


class IntentLogList(BaseModel):
    """Список логов с пагинацией"""
    items: List[IntentLogResponse] = Field(..., description="Логи")
    total: int = Field(..., description="Общее количество")
    page: int = Field(default=1, description="Текущая страница")
    page_size: int = Field(default=50, description="Размер страницы")


class IntentLogStats(BaseModel):
    """Статистика логов распознавания"""
    total_logs: int = Field(..., description="Всего логов")
    avg_confidence: float = Field(..., description="Средняя уверенность")
    low_confidence_count: int = Field(..., description="Логов с низкой уверенностью")
    intent_distribution: Dict[str, int] = Field(..., description="Распределение по намерениям")
    response_type_distribution: Dict[str, int] = Field(..., description="Распределение по типам ответа")
    period_start: datetime = Field(..., description="Начало периода")
    period_end: datetime = Field(..., description="Конец периода")


# ============================================
# ПАТТЕРНЫ РАСПОЗНАВАНИЯ
# ============================================

class IntentPatternBase(BaseModel):
    """Базовая схема паттерна"""
    intent_type: str = Field(..., description="Тип намерения")
    keywords: List[str] = Field(default_factory=list, description="Ключевые слова")
    required_keywords: List[str] = Field(default_factory=list, description="Обязательные слова")
    exclude_keywords: List[str] = Field(default_factory=list, description="Исключающие слова")
    priority: int = Field(default=5, ge=1, le=10, description="Приоритет")


class IntentPatternCreate(IntentPatternBase):
    """Схема создания паттерна"""
    confidence_boost: float = Field(default=0.3, ge=0.0, le=1.0, description="Бонус уверенности")
    description: Optional[str] = Field(None, description="Описание паттерна")
    examples: List[str] = Field(default_factory=list, description="Примеры запросов")
    is_system: bool = Field(default=False, description="Системный паттерн")


class IntentPatternUpdate(BaseModel):
    """Схема обновления паттерна"""
    keywords: Optional[List[str]] = None
    required_keywords: Optional[List[str]] = None
    exclude_keywords: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    confidence_boost: Optional[float] = Field(None, ge=0.0, le=1.0)
    description: Optional[str] = None
    examples: Optional[List[str]] = None
    is_active: Optional[bool] = None


class IntentPatternResponse(IntentPatternBase):
    """Схема ответа паттерна"""
    id: int = Field(..., description="ID паттерна")
    confidence_boost: float = Field(default=0.3, description="Бонус уверенности")
    version: int = Field(default=1, description="Версия")
    is_active: bool = Field(default=True, description="Активен")
    is_system: bool = Field(default=False, description="Системный")
    description: Optional[str] = None
    examples: List[str] = Field(default_factory=list, description="Примеры")
    created_at: Optional[datetime] = Field(None, description="Время создания")
    updated_at: Optional[datetime] = Field(None, description="Время обновления")

    class Config:
        from_attributes = True


class IntentPatternList(BaseModel):
    """Список паттернов"""
    items: List[IntentPatternResponse] = Field(..., description="Паттерны")
    total: int = Field(..., description="Общее количество")


class IntentPatternStats(BaseModel):
    """Статистика эффективности паттерна"""
    pattern_id: int = Field(..., description="ID паттерна")
    intent_type: str = Field(..., description="Тип намерения")
    total_matches: int = Field(..., description="Всего совпадений")
    avg_confidence: float = Field(..., description="Средняя уверенность")
    low_confidence_matches: int = Field(..., description="Совпадений с низкой уверенностью")
    high_confidence_matches: int = Field(..., description="Совпадений с высокой уверенностью")
    sample_messages: List[str] = Field(default_factory=list, description="Примеры сообщений")


# ============================================
# ИСТОРИЯ ИЗМЕНЕНИЙ
# ============================================

class PatternHistoryBase(BaseModel):
    """Базовая схема истории изменений"""
    pattern_id: Optional[int] = None
    intent_type: str = Field(..., description="Тип намерения")
    change_type: ChangeType = Field(..., description="Тип изменения")


class PatternHistoryCreate(PatternHistoryBase):
    """Схема создания записи истории"""
    old_data: Dict[str, Any] = Field(..., description="Старые данные")
    new_data: Dict[str, Any] = Field(..., description="Новые данные")
    change_reason: Optional[str] = Field(None, description="Причина изменения")
    applied_by: str = Field(default="user", description="Кто применил")


class PatternHistoryResponse(PatternHistoryBase):
    """Схема ответа истории"""
    id: UUID = Field(..., description="ID записи")
    old_data: Dict[str, Any] = Field(..., description="Старые данные")
    new_data: Dict[str, Any] = Field(..., description="Новые данные")
    change_reason: Optional[str] = None
    applied_by: Optional[str] = None
    is_rolled_back: bool = Field(default=False, description="Откачено")
    created_at: datetime = Field(..., description="Время создания")

    class Config:
        from_attributes = True


# ============================================
# ПРЕДЛОЖЕНИЯ ПО УЛУЧШЕНИЮ
# ============================================

class PatternImprovementBase(BaseModel):
    """Базовая схема предложения по улучшению"""
    intent_type: str = Field(..., description="Тип намерения")
    suggested_keywords: Optional[List[str]] = Field(None, description="Предлагаемые keywords")
    suggested_required_keywords: Optional[List[str]] = None
    suggested_exclude_keywords: Optional[List[str]] = None
    suggested_priority: Optional[int] = Field(None, ge=1, le=10)


class PatternImprovementCreate(PatternImprovementBase):
    """Схема создания предложения"""
    pattern_id: Optional[int] = Field(None, description="ID паттерна")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Уверенность в улучшении")
    analysis_data: Optional[Dict[str, Any]] = Field(None, description="Данные анализа")


class PatternImprovementResponse(PatternImprovementBase):
    """Схема ответа предложения"""
    id: UUID = Field(..., description="ID предложения")
    pattern_id: Optional[int] = None
    confidence: float = Field(..., description="Уверенность")
    analysis_data: Optional[Dict[str, Any]] = None
    status: ImprovementStatus = Field(default=ImprovementStatus.PENDING)
    applied_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime = Field(..., description="Время создания")

    class Config:
        from_attributes = True


class PatternImprovementList(BaseModel):
    """Список предложений"""
    items: List[PatternImprovementResponse] = Field(..., description="Предложения")
    total: int = Field(..., description="Общее количество")


class ApplyImprovementRequest(BaseModel):
    """Запрос на применение улучшения"""
    improvement_id: UUID = Field(..., description="ID предложения")
    auto_apply: bool = Field(default=False, description="Авто-применение")
    review_comment: Optional[str] = Field(None, description="Комментарий")


# ============================================
# АНАЛИЗ ПАТТЕРНОВ
# ============================================

class PatternAnalysisRequest(BaseModel):
    """Запрос на анализ паттернов"""
    period_hours: int = Field(default=24, ge=1, le=720, description="Период анализа (часы)")
    min_confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Порог уверенности")
    intent_types: Optional[List[str]] = Field(None, description="Фильтр по типам намерений")


class PatternAnalysisResult(BaseModel):
    """Результат анализа паттернов"""
    analyzed_logs_count: int = Field(..., description="Проанализировано логов")
    low_confidence_count: int = Field(..., description="С низкой уверенностью")
    potential_issues: List[Dict[str, Any]] = Field(default_factory=list, description="Потенциальные проблемы")
    suggested_improvements: List[PatternImprovementCreate] = Field(default_factory=list, description="Предложения")
    analysis_timestamp: datetime = Field(..., description="Время анализа")


class DashboardStats(BaseModel):
    """Статистика для дашборда"""
    total_patterns: int = Field(..., description="Всего паттернов")
    active_patterns: int = Field(..., description="Активных паттернов")
    total_logs_24h: int = Field(..., description="Логов за 24ч")
    avg_confidence_24h: float = Field(..., description="Средняя уверенность за 24ч")
    low_confidence_percentage: float = Field(..., description="Процент низкой уверенности")
    pending_improvements: int = Field(..., description="Ожидающих улучшений")
    auto_applied_24h: int = Field(..., description="Авто-применено за 24ч")
    intent_stats: List[IntentPatternStats] = Field(default_factory=list, description="Статистика по намерениям")
