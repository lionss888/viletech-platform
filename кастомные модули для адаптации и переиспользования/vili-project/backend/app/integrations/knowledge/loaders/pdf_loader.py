"""PDF loader for knowledge sources"""

import io
from PyPDF2 import PdfReader

from app.integrations.knowledge.loaders.file_loader import FileLoader
from app.core.exceptions import KnowledgeSourceException


class PDFLoader(FileLoader):
    """Загрузчик PDF файлов"""
    
    def __init__(self):
        super().__init__()
        self.pdf_reader = None
    
    def extract_text(self) -> str:
        """
        Извлечь текст из PDF файла
        
        Returns:
            str: Текст из PDF
        """
        if not self.file_content:
            return ""
        
        try:
            # Создаем PDF reader из bytes
            pdf_file = io.BytesIO(self.file_content)
            self.pdf_reader = PdfReader(pdf_file)
            
            # Извлекаем текст со всех страниц
            text_parts = []
            for page_num, page in enumerate(self.pdf_reader.pages, start=1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        # Добавляем номер страницы для контекста
                        text_parts.append(f"[Страница {page_num}]\n{page_text}")
                except Exception as e:
                    # Пропускаем страницу если не удалось извлечь текст
                    text_parts.append(f"[Страница {page_num}] - Ошибка извлечения: {str(e)}")
            
            # Обновляем метаданные
            self.metadata.update({
                "pages_count": len(self.pdf_reader.pages),
                "pdf_info": self.pdf_reader.metadata if hasattr(self.pdf_reader, 'metadata') else {},
            })
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to extract text from PDF: {str(e)}",
                details={"error": str(e)}
            )
    
    def get_page_text(self, page_number: int) -> str:
        """
        Получить текст конкретной страницы
        
        Args:
            page_number: Номер страницы (начиная с 1)
        
        Returns:
            str: Текст страницы
        """
        if not self.pdf_reader:
            raise KnowledgeSourceException("PDF not loaded")
        
        if page_number < 1 or page_number > len(self.pdf_reader.pages):
            raise KnowledgeSourceException(
                f"Invalid page number: {page_number}",
                details={"total_pages": len(self.pdf_reader.pages)}
            )
        
        try:
            page = self.pdf_reader.pages[page_number - 1]
            return page.extract_text()
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to extract text from page {page_number}: {str(e)}",
                details={"page_number": page_number, "error": str(e)}
            )
