"""Base loader for knowledge sources"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseLoader(ABC):
    """Базовый класс для загрузчиков источников знаний"""
    
    def __init__(self):
        self.content = None
        self.metadata = {}
    
    @abstractmethod
    async def load(self, source: str, **kwargs) -> str:
        """
        Загрузить контент из источника
        
        Args:
            source: Путь к источнику (URL, путь к файлу и т.д.)
            **kwargs: Дополнительные параметры
        
        Returns:
            str: Загруженный контент
        """
        pass
    
    @abstractmethod
    def extract_text(self) -> str:
        """
        Извлечь текст из загруженного контента
        
        Returns:
            str: Извлеченный текст
        """
        pass
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Получить метаданные источника
        
        Returns:
            dict: Метаданные
        """
        return self.metadata
    
    def validate_source(self, source: str) -> bool:
        """
        Валидировать источник
        
        Args:
            source: Путь к источнику
        
        Returns:
            bool: True если источник валиден
        """
        return bool(source)
