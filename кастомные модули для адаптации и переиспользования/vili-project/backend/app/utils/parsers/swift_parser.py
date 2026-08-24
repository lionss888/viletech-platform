"""SWIFT message parser"""

import re
from typing import Dict, Any, List

from app.core.exceptions import DocumentProcessingException


class SWIFTParser:
    """Парсер SWIFT сообщений"""
    
    def __init__(self):
        self.content = None
        self.metadata = {}
    
    def parse(self, file_content: bytes) -> Dict[str, Any]:
        """
        Парсинг SWIFT сообщения
        
        Args:
            file_content: Содержимое SWIFT файла
        
        Returns:
            Dict: Распарсенные данные
        """
        try:
            # Декодируем content
            swift_text = file_content.decode('utf-8')
            
            # Определяем тип сообщения
            message_type = self._extract_message_type(swift_text)
            
            # Извлекаем блоки SWIFT
            blocks = self._parse_swift_blocks(swift_text)
            
            # Извлекаем поля
            fields = self._parse_swift_fields(swift_text)
            
            # Формируем читаемый текст
            text_parts = [f"SWIFT Message Type: {message_type}"]
            for field_code, field_value in fields.items():
                text_parts.append(f"{field_code}: {field_value}")
            
            full_text = "\n".join(text_parts)
            
            self.content = full_text
            self.metadata = {
                'message_type': message_type,
                'fields_count': len(fields),
                'format': 'SWIFT'
            }
            
            return {
                'text': full_text,
                'metadata': self.metadata,
                'parsed_data': {
                    'message_type': message_type,
                    'blocks': blocks,
                    'fields': fields
                }
            }
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to parse SWIFT: {str(e)}",
                details={"error": str(e)}
            )
    
    def _extract_message_type(self, text: str) -> str:
        """Извлечение типа SWIFT сообщения"""
        # Ищем MT103, MT202 и т.д.
        match = re.search(r'MT(\d{3})', text)
        if match:
            return f"MT{match.group(1)}"
        
        # Альтернативный формат
        match = re.search(r'\{2:.*?O(\d{3})', text)
        if match:
            return f"MT{match.group(1)}"
        
        return "Unknown"
    
    def _parse_swift_blocks(self, text: str) -> Dict[str, str]:
        """Парсинг блоков SWIFT"""
        blocks = {}
        
        # Блок 1: Basic Header
        match = re.search(r'\{1:([^}]+)\}', text)
        if match:
            blocks['block1'] = match.group(1)
        
        # Блок 2: Application Header
        match = re.search(r'\{2:([^}]+)\}', text)
        if match:
            blocks['block2'] = match.group(1)
        
        # Блок 3: User Header
        match = re.search(r'\{3:([^}]+)\}', text)
        if match:
            blocks['block3'] = match.group(1)
        
        # Блок 4: Text
        match = re.search(r'\{4:(.*?)\}', text, re.DOTALL)
        if match:
            blocks['block4'] = match.group(1)
        
        # Блок 5: Trailers
        match = re.search(r'\{5:([^}]+)\}', text)
        if match:
            blocks['block5'] = match.group(1)
        
        return blocks
    
    def _parse_swift_fields(self, text: str) -> Dict[str, str]:
        """Парсинг полей SWIFT"""
        fields = {}
        
        # Ищем поля в формате :20:, :32A:, и т.д.
        field_pattern = r':(\d{1,3}[A-Z]?):(.*?)(?=:|$|\n:)'
        matches = re.findall(field_pattern, text, re.MULTILINE | re.DOTALL)
        
        for field_code, field_value in matches:
            fields[f":{field_code}:"] = field_value.strip()
        
        return fields
