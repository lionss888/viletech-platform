"""Pydantic schemas for Intent Detection.

This module provides data models for intent recognition in chat messages,
enabling the universal chat interface to route requests appropriately.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


class IntentType(str, Enum):
    """Типы намерений пользователя"""
    # Аналитика операторов (VILI)
    OPERATOR_ANALYTICS = "operator_analytics"
    OPERATOR_LIST = "operator_list"
    OPERATOR_COMPARE = "operator_compare"
    OPERATOR_STATISTICS = "operator_statistics"
    
    # Отчёты
    CREATE_REPORT = "create_report"
    
    # Заявки (fea-stage)
    LIST_FORM_PAYMENTS = "list_form_payments"
    GET_FORM_PAYMENT_STATUS = "get_form_payment_status"
    CREATE_FORM_PAYMENT = "create_form_payment"
    
    # Контрагенты (fea-stage)
    LIST_COUNTERPARTIES = "list_counterparties"
    GET_COUNTERPARTY = "get_counterparty"
    GET_COUNTERPARTY_REQUESTS = "get_counterparty_requests"
    
    # Контракты (fea-stage)
    LIST_CONTRACTS = "list_contracts"
    GET_CONTRACT = "get_contract"
    GET_CONTRACT_DIADOC_STATUS = "get_contract_diadoc_status"
    
    # Валюты (fea-stage)
    GET_CURRENCY_RATES = "get_currency_rates"
    GET_CURRENCY_BY_SYMBOL = "get_currency_by_symbol"
    
    # Compliance
    CHECK_COMPLIANCE = "check_compliance"
    COMPLIANCE_EVENTS = "compliance_events"
    
    # Документы
    ANALYZE_DOCUMENT = "analyze_document"
    
    # Управление проектами (бизнес-методология)
    PROJECT_MANAGEMENT = "project_management"
    
    # Обычный чат (fallback)
    CHAT = "chat"


class EntityType(str, Enum):
    """Типы сущностей, извлекаемых из сообщения"""
    # Операторы
    OPERATOR_NAME = "operator_name"
    OPERATOR_ID = "operator_id"
    
    # Общие
    PERIOD_DAYS = "period_days"
    
    # Заявки
    FORM_PAYMENT_ID = "form_payment_id"
    FORM_PAYMENT_STATUS = "form_payment_status"
    
    # Контрагенты
    COUNTERPARTY_ID = "counterparty_id"
    COUNTERPARTY_NAME = "counterparty_name"
    COUNTERPARTY_COUNTRY = "counterparty_country"
    
    # Контракты
    CONTRACT_ID = "contract_id"
    CONTRACT_NUMBER = "contract_number"
    
    # Валюты
    CURRENCY_SYMBOL = "currency_symbol"
    CURRENCY_SOURCE = "currency_source"
    
    # Отчёты и документы
    REPORT_TYPE = "report_type"
    DOCUMENT_ID = "document_id"
    
    # Управление проектами
    PROJECT_PHASE = "project_phase"  # инициация, планирование, исполнение, мониторинг, завершение


class ExtractedEntity(BaseModel):
    """Извлечённая сущность из сообщения"""
    type: EntityType = Field(..., description="Тип сущности")
    value: Any = Field(..., description="Значение сущности")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Уверенность извлечения")
    raw_text: Optional[str] = Field(None, description="Исходный текст")


class IntentResult(BaseModel):
    """Результат распознавания намерения"""
    intent: IntentType = Field(..., description="Распознанное намерение")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Уверенность распознавания")
    entities: List[ExtractedEntity] = Field(default_factory=list, description="Извлечённые сущности")
    original_message: str = Field(..., description="Исходное сообщение")
    
    # Вспомогательные методы
    def get_entity(self, entity_type: EntityType) -> Optional[Any]:
        """Получить значение сущности по типу"""
        for entity in self.entities:
            if entity.type == entity_type:
                return entity.value
        return None
    
    def has_entity(self, entity_type: EntityType) -> bool:
        """Проверить наличие сущности"""
        return any(e.type == entity_type for e in self.entities)


class IntentPattern(BaseModel):
    """Паттерн для распознавания намерения"""
    intent: IntentType = Field(..., description="Тип намерения")
    keywords: List[str] = Field(..., description="Ключевые слова")
    required_keywords: List[str] = Field(default_factory=list, description="Обязательные слова")
    exclude_keywords: List[str] = Field(default_factory=list, description="Исключающие слова")
    priority: int = Field(default=0, description="Приоритет (выше = важнее)")
