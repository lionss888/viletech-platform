"""Text chunker for splitting text into chunks"""

import re
from typing import List, Dict, Any, Optional


class TextChunker:
    """Разбиение текста на chunks для RAG"""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separator: str = "\n\n",
    ):
        """
        Инициализация chunker
        
        Args:
            chunk_size: Размер chunk в символах
            chunk_overlap: Перекрытие между chunks
            separator: Разделитель для разбиения
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator
    
    def split_text(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Разбить текст на chunks
        
        Args:
            text: Текст для разбиения
            metadata: Базовые метаданные для всех chunks
        
        Returns:
            List[Dict]: Список chunks с метаданными
        """
        if not text:
            return []
        
        # Нормализуем текст
        text = self._normalize_text(text)
        
        # Разбиваем на абзацы
        paragraphs = text.split(self.separator)
        
        chunks = []
        current_chunk = ""
        current_chunk_index = 0
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # Если параграф слишком большой, разбиваем его
            if len(paragraph) > self.chunk_size:
                # Если текущий chunk не пустой, сохраняем его
                if current_chunk:
                    chunks.append(self._create_chunk(current_chunk, current_chunk_index, metadata))
                    current_chunk_index += 1
                    current_chunk = ""
                # Сохраняем текущий chunk если есть
                if current_chunk:
                    chunks.append(self._create_chunk(current_chunk, current_chunk_index, metadata))
                    current_chunk_index += 1
                    current_chunk = ""
                
                # Разбиваем большой параграф на предложения
                sentences = self._split_into_sentences(paragraph)
                if not sentences or len(sentences) == 1:
                    # Если предложений нет или только одно, разбиваем напрямую по chunk_size
                    step = max(1, self.chunk_size - self.chunk_overlap)
                    for i in range(0, len(paragraph), step):
                        chunk_text = paragraph[i:i + self.chunk_size]
                        if chunk_text:
                            chunks.append(self._create_chunk(chunk_text, current_chunk_index, metadata))
                            current_chunk_index += 1
                        if i + self.chunk_size >= len(paragraph):
                            break
                else:
                    for sentence in sentences:
                        if len(current_chunk) + len(sentence) > self.chunk_size:
                            if current_chunk:
                                chunks.append(self._create_chunk(current_chunk, current_chunk_index, metadata))
                                current_chunk_index += 1
                                # Добавляем overlap из предыдущего chunk
                                current_chunk = self._get_overlap(current_chunk, sentence)
                            else:
                                current_chunk = sentence
                        else:
                            current_chunk += " " + sentence if current_chunk else sentence
            else:
                # Добавляем параграф к текущему chunk
                if len(current_chunk) + len(paragraph) > self.chunk_size:
                    chunks.append(self._create_chunk(current_chunk, current_chunk_index, metadata))
                    current_chunk_index += 1
                    # Добавляем overlap
                    current_chunk = self._get_overlap(current_chunk, paragraph)
                else:
                    current_chunk += self.separator + paragraph if current_chunk else paragraph
        
        # Добавляем последний chunk
        if current_chunk:
            chunks.append(self._create_chunk(current_chunk, current_chunk_index, metadata))
        
        return chunks
    
    def _normalize_text(self, text: str) -> str:
        """Нормализовать текст"""
        # Сначала нормализуем переносы строк (параграфы)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        # Затем заменяем множественные пробелы (но не трогаем \n)
        text = re.sub(r'[^\S\n]+', ' ', text)
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Разбить текст на предложения"""
        # Простое разбиение по точкам, вопросительным и восклицательным знакам
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _get_overlap(self, previous_chunk: str, next_content: str) -> str:
        """Получить overlap из предыдущего chunk"""
        if len(previous_chunk) <= self.chunk_overlap:
            return previous_chunk + self.separator + next_content
        
        # Берем последние chunk_overlap символов из предыдущего chunk
        overlap = previous_chunk[-self.chunk_overlap:]
        
        # Находим начало последнего предложения в overlap
        sentences = self._split_into_sentences(overlap)
        if sentences:
            overlap = sentences[-1]
        
        return overlap + self.separator + next_content
    
    def _create_chunk(
        self,
        content: str,
        index: int,
        base_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Создать chunk с метаданными"""
        chunk = {
            "content": content.strip(),
            "metadata": {
                "chunk_index": index,
                "chunk_size": len(content),
                **(base_metadata or {})
            }
        }
        return chunk
    
    def split_by_pages(
        self,
        text: str,
        page_separator: str = "[Страница ",
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Разбить текст на chunks по страницам (для PDF)
        
        Args:
            text: Текст с разметкой страниц
            page_separator: Разделитель страниц
            metadata: Базовые метаданные
        
        Returns:
            List[Dict]: Список chunks с метаданными страниц
        """
        chunks = []
        pages = text.split(page_separator)
        
        for i, page_content in enumerate(pages):
            if not page_content.strip():
                continue
            
            # Извлекаем номер страницы
            page_match = re.match(r'(\d+)\]', page_content)
            page_number = int(page_match.group(1)) if page_match else i
            
            # Удаляем номер страницы из контента
            if page_match:
                page_content = page_content[page_match.end():].strip()
            
            # Разбиваем страницу на chunks если она большая
            page_metadata = {
                **(metadata or {}),
                "page_number": page_number,
            }
            
            if len(page_content) > self.chunk_size:
                page_chunks = self.split_text(page_content, page_metadata)
                chunks.extend(page_chunks)
            else:
                chunks.append(self._create_chunk(page_content, len(chunks), page_metadata))
        
        return chunks
