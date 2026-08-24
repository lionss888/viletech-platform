"""Document processor service"""

from typing import Dict, Any, Optional
from pathlib import Path

from app.core.exceptions import DocumentProcessingException
from app.utils.parsers import PDFParser, XMLParser, JSONParser, SWIFTParser


class DocumentProcessor:
    """Сервис для обработки документов различных форматов"""
    
    def __init__(self):
        self.parsers = {
            'pdf': PDFParser(),
            'xml': XMLParser(),
            'json': JSONParser(),
            'swift': SWIFTParser(),
            'txt': None  # Текстовые файлы обрабатываются напрямую
        }
    
    def process_document(
        self,
        file_content: bytes,
        file_name: str,
        file_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Обработка документа
        
        Args:
            file_content: Содержимое файла
            file_name: Имя файла
            file_format: Формат файла (определяется автоматически если не указан)
        
        Returns:
            Dict: Результат обработки
        """
        # Определяем формат если не указан
        if not file_format:
            file_format = self.detect_format(file_name, file_content)
        
        format_lower = file_format.lower().lstrip('.')
        
        try:
            # Обрабатываем в зависимости от формата
            if format_lower == 'txt':
                return self._process_text(file_content)
            elif format_lower in self.parsers:
                parser = self.parsers[format_lower]
                return parser.parse(file_content)
            else:
                # Пытаемся обработать как текст
                return self._process_text(file_content)
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to process document: {str(e)}",
                details={
                    "file_name": file_name,
                    "file_format": file_format,
                    "error": str(e)
                }
            )
    
    def detect_format(self, file_name: str, file_content: bytes) -> str:
        """
        Определение формата файла
        
        Args:
            file_name: Имя файла
            file_content: Содержимое файла
        
        Returns:
            str: Формат файла
        """
        # Сначала пробуем по расширению
        ext = Path(file_name).suffix.lower().lstrip('.')
        
        if ext in ['pdf', 'xml', 'json', 'txt', 'csv']:
            return ext
        
        # Проверяем SWIFT формат
        try:
            text = file_content.decode('utf-8')
            if 'MT' in text[:100] and '{' in text[:100]:
                return 'swift'
        except:
            pass
        
        # По умолчанию текст
        return 'txt'
    
    def _process_text(self, file_content: bytes) -> Dict[str, Any]:
        """Обработка текстового файла"""
        try:
            # Пробуем различные кодировки
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1251']
            
            for encoding in encodings:
                try:
                    text = file_content.decode(encoding)
                    return {
                        'text': text,
                        'metadata': {
                            'format': 'TXT',
                            'encoding': encoding,
                            'length': len(text)
                        },
                        'parsed_data': {
                            'lines': len(text.splitlines())
                        }
                    }
                except UnicodeDecodeError:
                    continue
            
            raise DocumentProcessingException("Failed to decode text file")
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to process text: {str(e)}",
                details={"error": str(e)}
            )
    
    def extract_key_fields(self, parsed_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """
        Извлечение ключевых полей из документа
        
        Args:
            parsed_data: Распарсенные данные
            document_type: Тип документа
        
        Returns:
            Dict: Ключевые поля
        """
        # Базовая реализация - можно расширить для конкретных типов документов
        key_fields = {}
        
        if document_type == 'SWIFT' and 'fields' in parsed_data:
            fields = parsed_data['fields']
            key_fields = {
                'sender': fields.get(':50:', ''),
                'receiver': fields.get(':59:', ''),
                'amount': fields.get(':32A:', ''),
                'reference': fields.get(':20:', ''),
                'date': fields.get(':30:', '')
            }
        
        return key_fields
