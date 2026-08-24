"""Pydantic schemas for Chat API.

This module provides extended data models for the universal chat interface,
including support for links, actions, and embedded data.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


class ActionType(str, Enum):
    """Типы быстрых действий"""
    LINK = "link"           # Переход по ссылке
    DOWNLOAD = "download"   # Скачивание файла
    CREATE = "create"       # Создание объекта
    COMPARE = "compare"     # Сравнение


class ChatAction(BaseModel):
    """Быстрое действие в ответе чата"""
    type: ActionType = Field(..., description="Тип действия")
    label: str = Field(..., description="Текст кнопки")
    url: Optional[str] = Field(None, description="URL для перехода/скачивания")
    data: Optional[Dict[str, Any]] = Field(None, description="Данные для действия")


class ChatMessage(BaseModel):
    """Сообщение пользователя в чат"""
    message: str = Field(..., min_length=1, description="Текст сообщения")
    model: str = Field(default="local-llama", description="Модель LLM")
    use_rag: bool = Field(default=True, description="Использовать базу знаний")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Температура генерации")
    max_tokens: int = Field(default=2000, ge=100, le=8000, description="Максимум токенов")


class ChatResponseExtended(BaseModel):
    """Расширенный ответ от ассистента с ссылками и действиями"""
    answer: str = Field(..., description="Текстовый ответ")
    context_used: bool = Field(default=False, description="Использована ли база знаний")
    model: str = Field(default="vili", description="Использованная модель")
    sources: Optional[List[str]] = Field(None, description="Источники из базы знаний")
    
    # Расширенные поля
    links: Optional[Dict[str, str]] = Field(
        None, 
        description="Ссылки на детальные страницы {'Текст': 'url'}"
    )
    actions: Optional[List[ChatAction]] = Field(
        None, 
        description="Быстрые действия"
    )
    embedded_data: Optional[Dict[str, Any]] = Field(
        None, 
        description="Данные для встроенных виджетов"
    )
    
    # Метаданные
    intent_type: Optional[str] = Field(
        None, 
        description="Распознанное намерение (для отладки)"
    )
    processing_time_ms: Optional[int] = Field(
        None, 
        description="Время обработки в мс"
    )


class EmbeddedDataType(str, Enum):
    """Типы встроенных данных"""
    OPERATOR_ANALYTICS = "operator_analytics"
    OPERATOR_LIST = "operator_list"
    FORM_PAYMENTS_LIST = "form_payments_list"
    REPORT = "report"
    CHART = "chart"


class OperatorEmbeddedData(BaseModel):
    """Встроенные данные для аналитики оператора"""
    type: str = Field(default="operator_analytics")
    operator_id: str
    operator_name: str
    compliance_score: float
    success_rate: float
    applications_processed: int


class FormPaymentsEmbeddedData(BaseModel):
    """Встроенные данные для списка заявок"""
    type: str = Field(default="form_payments_list")
    total_count: int
    active_count: int
    pending_count: int
