"""File loader for knowledge sources"""

import os
from pathlib import Path
from typing import Optional

from app.integrations.knowledge.loaders.base_loader import BaseLoader
from app.core.exceptions import KnowledgeSourceException


class FileLoader(BaseLoader):
    """Базовый загрузчик файлов"""
    
    def __init__(self):
        super().__init__()
        self.file_path = None
        self.file_content = None
    
    async def load(self, source: str, **kwargs) -> bytes:
        """
        Загрузить файл
        
        Args:
            source: Путь к файлу
            **kwargs: Дополнительные параметры
        
        Returns:
            bytes: Содержимое файла
        """
        if not self.validate_source(source):
            raise KnowledgeSourceException("Invalid file path", details={"path": source})
        
        try:
            self.file_path = Path(source)
            
            with open(self.file_path, 'rb') as f:
                self.file_content = f.read()
            
            self.metadata = {
                "file_path": str(self.file_path),
                "file_name": self.file_path.name,
                "file_size": len(self.file_content),
                "file_extension": self.file_path.suffix,
            }
            
            return self.file_content
        except FileNotFoundError:
            raise KnowledgeSourceException(
                f"File not found: {source}",
                details={"path": source}
            )
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to load file: {str(e)}",
                details={"path": source, "error": str(e)}
            )
    
    def extract_text(self) -> str:
        """
        Извлечь текст из файла (должен быть переопределен в подклассах)
        
        Returns:
            str: Извлеченный текст
        """
        if not self.file_content:
            return ""
        
        # Для текстовых файлов просто декодируем
        try:
            return self.file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return self.file_content.decode('latin-1')
            except Exception as e:
                raise KnowledgeSourceException(
                    f"Failed to decode file: {str(e)}",
                    details={"error": str(e)}
                )
    
    def validate_source(self, source: str) -> bool:
        """Валидация пути к файлу"""
        if not source:
            return False
        
        path = Path(source)
        return path.exists() and path.is_file()
