"""Base Handler for Chat Requests.

Provides common functionality for all chat handlers.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.schemas.intent import IntentResult, EntityType


class ChatResponseData(BaseModel):
    """Данные для формирования ChatResponse."""
    answer: str
    context_used: bool = True
    model: str = "vili"
    sources: Optional[List[str]] = None
    links: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    embedded_data: Optional[Dict[str, Any]] = None


class BaseHandler(ABC):
    """Базовый класс для обработчиков чат-запросов."""
    
    def __init__(self, db: Session):
        """Инициализация обработчика.
        
        Args:
            db: Сессия базы данных
        """
        self.db = db
    
    @abstractmethod
    async def handle(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработать запрос.
        
        Args:
            intent_result: Результат распознавания намерения
            
        Returns:
            ChatResponseData: Данные для формирования ответа
        """
        pass
    
    def get_entity(
        self, 
        intent_result: IntentResult, 
        entity_type: EntityType, 
        default: Any = None
    ) -> Any:
        """Получить значение сущности из intent_result."""
        value = intent_result.get_entity(entity_type)
        return value if value is not None else default
    
    def format_percentage(self, value: float) -> str:
        """Форматирование процентов."""
        return f"{value:.1%}"
    
    def format_currency(self, value: float, currency: str = "USD") -> str:
        """Форматирование валюты."""
        return f"{value:,.2f} {currency}"
    
    def create_link(self, text: str, url: str) -> str:
        """Создание markdown ссылки."""
        return f"[{text}]({url})"
    
    def create_action(
        self, 
        action_type: str, 
        label: str, 
        url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Создание объекта действия."""
        action = {"type": action_type, "label": label}
        if url:
            action["url"] = url
        if data:
            action["data"] = data
        return action
