"""TXT loader for knowledge sources"""

from app.integrations.knowledge.loaders.file_loader import FileLoader
from app.core.exceptions import KnowledgeSourceException


class TXTLoader(FileLoader):
    """Загрузчик текстовых файлов"""
    
    def __init__(self):
        super().__init__()
    
    def extract_text(self) -> str:
        """
        Извлечь текст из текстового файла
        
        Returns:
            str: Текст из файла
        """
        if not self.file_content:
            return ""
        
        try:
            # Пробуем различные кодировки
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1251', 'cp1252']
            
            for encoding in encodings:
                try:
                    text = self.file_content.decode(encoding)
                    
                    # Обновляем метаданные
                    self.metadata.update({
                        "encoding": encoding,
                        "lines_count": len(text.splitlines()),
                        "characters_count": len(text),
                    })
                    
                    return text
                except UnicodeDecodeError:
                    continue
            
            # Если ни одна кодировка не подошла
            raise KnowledgeSourceException(
                "Failed to decode text file with known encodings",
                details={"tried_encodings": encodings}
            )
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to extract text: {str(e)}",
                details={"error": str(e)}
            )
