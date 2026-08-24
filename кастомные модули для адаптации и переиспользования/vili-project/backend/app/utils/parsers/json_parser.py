"""JSON document parser"""

import json
from typing import Dict, Any

from app.core.exceptions import DocumentProcessingException


class JSONParser:
    """Парсер JSON документов"""
    
    def __init__(self):
        self.content = None
        self.metadata = {}
    
    def parse(self, file_content: bytes) -> Dict[str, Any]:
        """
        Парсинг JSON файла
        
        Args:
            file_content: Содержимое JSON файла
        
        Returns:
            Dict: Распарсенные данные
        """
        try:
            # Декодируем content
            json_string = file_content.decode('utf-8')
            
            # Парсим JSON
            parsed_data = json.loads(json_string)
            
            # Извлекаем текст из JSON
            text = self._extract_text_from_json(parsed_data)
            
            self.content = text
            self.metadata = {
                'format': 'JSON',
                'structure_type': type(parsed_data).__name__
            }
            
            return {
                'text': text,
                'metadata': self.metadata,
                'parsed_data': parsed_data
            }
        except json.JSONDecodeError as e:
            raise DocumentProcessingException(
                f"Invalid JSON format: {str(e)}",
                details={"error": str(e)}
            )
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to parse JSON: {str(e)}",
                details={"error": str(e)}
            )
    
    def _extract_text_from_json(self, data: Any, depth: int = 0) -> str:
        """Рекурсивное извлечение текста из JSON"""
        text_parts = []
        
        if isinstance(data, dict):
            for key, value in data.items():
                text_parts.append(f"{key}: {self._extract_text_from_json(value, depth + 1)}")
        elif isinstance(data, list):
            for item in data:
                text_parts.append(self._extract_text_from_json(item, depth + 1))
        else:
            text_parts.append(str(data))
        
        separator = "\n" if depth == 0 else ", "
        return separator.join(text_parts)
