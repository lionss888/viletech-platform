"""PDF document parser"""

import io
from typing import Dict, Any, Optional
from PyPDF2 import PdfReader

from app.core.exceptions import DocumentProcessingException


class PDFParser:
    """Парсер PDF документов"""
    
    def __init__(self):
        self.content = None
        self.metadata = {}
    
    def parse(self, file_content: bytes) -> Dict[str, Any]:
        """
        Парсинг PDF файла
        
        Args:
            file_content: Содержимое PDF файла
        
        Returns:
            Dict: Распарсенные данные
        """
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PdfReader(pdf_file)
            
            # Извлекаем текст
            text_parts = []
            for page_num, page in enumerate(pdf_reader.pages, start=1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                except Exception as e:
                    # Пропускаем страницу если не удалось извлечь текст
                    pass
            
            full_text = "\n\n".join(text_parts)
            
            # Извлекаем метаданные
            pdf_metadata = {}
            if hasattr(pdf_reader, 'metadata') and pdf_reader.metadata:
                pdf_metadata = {
                    'title': pdf_reader.metadata.get('/Title'),
                    'author': pdf_reader.metadata.get('/Author'),
                    'subject': pdf_reader.metadata.get('/Subject'),
                    'creator': pdf_reader.metadata.get('/Creator'),
                    'producer': pdf_reader.metadata.get('/Producer'),
                    'creation_date': pdf_reader.metadata.get('/CreationDate'),
                }
            
            self.content = full_text
            self.metadata = {
                'pages_count': len(pdf_reader.pages),
                'pdf_metadata': pdf_metadata,
                'format': 'PDF'
            }
            
            return {
                'text': full_text,
                'metadata': self.metadata,
                'parsed_data': {
                    'pages': len(pdf_reader.pages),
                    'has_text': bool(full_text.strip())
                }
            }
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to parse PDF: {str(e)}",
                details={"error": str(e)}
            )
