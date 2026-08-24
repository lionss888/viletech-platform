"""CSV loader for knowledge sources"""

import csv
import io
from typing import List, Dict

from app.integrations.knowledge.loaders.file_loader import FileLoader
from app.core.exceptions import KnowledgeSourceException


class CSVLoader(FileLoader):
    """Загрузчик CSV файлов"""
    
    def __init__(self):
        super().__init__()
        self.rows = []
        self.headers = []
    
    def extract_text(self) -> str:
        """
        Извлечь текст из CSV файла
        
        Returns:
            str: Текст из CSV (каждая строка как отдельный фрагмент)
        """
        if not self.file_content:
            return ""
        
        try:
            # Декодируем content
            content_str = self.file_content.decode('utf-8')
            
            # Парсим CSV
            csv_reader = csv.reader(io.StringIO(content_str))
            rows = list(csv_reader)
            
            if not rows:
                return ""
            
            # Первая строка - заголовки
            self.headers = rows[0]
            self.rows = rows[1:]
            
            # Формируем текст
            # Для каждой строки создаем читаемое описание
            text_parts = []
            for row in self.rows:
                if len(row) == len(self.headers):
                    # Создаем структурированное описание строки
                    row_text = ", ".join([f"{header}: {value}" for header, value in zip(self.headers, row)])
                    text_parts.append(row_text)
            
            # Обновляем метаданные
            self.metadata.update({
                "rows_count": len(self.rows),
                "columns_count": len(self.headers),
                "headers": self.headers,
            })
            
            return "\n".join(text_parts)
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to parse CSV: {str(e)}",
                details={"error": str(e)}
            )
    
    def get_rows_as_dicts(self) -> List[Dict[str, str]]:
        """
        Получить строки CSV как список словарей
        
        Returns:
            List[Dict]: Список словарей (каждая строка)
        """
        if not self.rows or not self.headers:
            return []
        
        return [dict(zip(self.headers, row)) for row in self.rows]
