"""Knowledge Source Service for managing knowledge sources"""

import os
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import KnowledgeSourceException
from app.database.models.knowledge_source import KnowledgeSource
from app.database.models.knowledge_chunk import KnowledgeChunk
from app.services.embedding_service import EmbeddingService
from app.integrations.knowledge.loaders import (
    URLLoader,
    CSVLoader,
    TXTLoader,
    PDFLoader
)
from app.integrations.knowledge.chunkers.text_chunker import TextChunker

logger = logging.getLogger(__name__)


class KnowledgeSourceService:
    """Сервис для управления источниками знаний"""
    
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()
        self.text_chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        self.upload_dir = Path(settings.UPLOAD_DIR)
        
        # Создаем директорию для загрузок если её нет
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    async def add_url_source(
        self,
        name: str,
        url: str,
        description: Optional[str] = None,
        auto_refresh: bool = False,
        created_by: Optional[UUID] = None,
        category: Optional[str] = None
    ) -> KnowledgeSource:
        """
        Добавить источник знаний по URL
        
        Args:
            name: Название источника
            url: URL источника
            description: Описание
            auto_refresh: Автоматическое обновление
            created_by: ID создателя
            category: Категория знаний (ved, compliance, project_management, etc.)
        
        Returns:
            KnowledgeSource: Созданный источник
        """
        try:
            # Создаем запись источника
            source = KnowledgeSource(
                name=name,
                source_type="url",
                source_url=url,
                description=description,
                is_active=True,
                auto_refresh=auto_refresh,
                created_by=created_by,
                category=category,
                source_metadata={}
            )
            
            self.db.add(source)
            self.db.flush()
            
            # Загружаем и обрабатываем контент
            await self.process_source_content(source.id)
            
            self.db.commit()
            self.db.refresh(source)
            
            return source
        except Exception as e:
            self.db.rollback()
            raise KnowledgeSourceException(
                f"Failed to add URL source: {str(e)}",
                details={"url": url, "error": str(e)}
            )
    
    async def add_file_source(
        self,
        name: str,
        file: UploadFile,
        description: Optional[str] = None,
        created_by: Optional[UUID] = None,
        category: Optional[str] = None,
        owner_only: bool = False
    ) -> KnowledgeSource:
        """
        Добавить источник знаний из файла
        
        Args:
            name: Название источника
            file: Загруженный файл
            description: Описание
            created_by: ID создателя
            category: Категория знаний (project_management, compliance, etc.)
            owner_only: Доступ только для владельца
        
        Returns:
            KnowledgeSource: Созданный источник
        """
        try:
            # Определяем формат файла
            file_ext = Path(file.filename).suffix.lower()
            
            # Сохраняем файл
            file_path = self.upload_dir / f"{datetime.utcnow().timestamp()}_{file.filename}"
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Создаем запись источника
            source = KnowledgeSource(
                name=name,
                source_type="file",
                file_path=str(file_path),
                file_format=file_ext.lstrip('.'),
                description=description,
                is_active=True,
                auto_refresh=False,
                created_by=created_by,
                category=category,
                owner_only=owner_only,
                source_metadata={"original_filename": file.filename}
            )
            
            self.db.add(source)
            self.db.flush()
            
            # Обрабатываем контент
            await self.process_source_content(source.id)
            
            self.db.commit()
            self.db.refresh(source)
            
            return source
        except Exception as e:
            self.db.rollback()
            if file_path and file_path.exists():
                file_path.unlink()
            raise KnowledgeSourceException(
                f"Failed to add file source: {str(e)}",
                details={"filename": file.filename, "error": str(e)}
            )
    
    async def process_source_content(self, source_id: UUID) -> int:
        """
        Обработать контент источника: загрузить, разбить на chunks, создать embeddings
        
        Args:
            source_id: ID источника
        
        Returns:
            int: Количество созданных chunks
        """
        source = self.db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
        
        if not source:
            raise KnowledgeSourceException(f"Source {source_id} not found")
        
        try:
            # Загружаем контент в зависимости от типа
            if source.source_type == "url":
                loader = URLLoader()
                # Сначала пробуем обычную загрузку
                await loader.load(source.source_url)
                text = loader.extract_text()
                metadata = loader.get_metadata()
                
                # Если текст пустой и страница большая, пробуем Playwright
                if not text or len(text.strip()) < 50:
                    if metadata.get("content_length", 0) > 1000:
                        logger.info(f"Source {source_id}: Text is empty, trying Playwright for JavaScript rendering")
                        try:
                            await loader.load(source.source_url, use_playwright=True)
                            text = loader.extract_text()
                            metadata = loader.get_metadata()
                            if text and len(text.strip()) > 50:
                                logger.info(f"Source {source_id}: Successfully extracted {len(text)} chars with Playwright")
                        except Exception as e:
                            logger.warning(f"Source {source_id}: Playwright failed, using original content: {str(e)}")
            
            elif source.source_type == "file":
                # Выбираем загрузчик по формату
                if source.file_format == "pdf":
                    loader = PDFLoader()
                elif source.file_format == "csv":
                    loader = CSVLoader()
                else:
                    loader = TXTLoader()
                
                await loader.load(source.file_path)
                text = loader.extract_text()
                metadata = loader.get_metadata()
            
            else:
                raise KnowledgeSourceException(f"Unsupported source type: {source.source_type}")
            
            # Проверяем, что текст не пустой
            if not text or not text.strip():
                logger.warning(f"Source {source_id}: Extracted text is empty. URL: {source.source_url if source.source_type == 'url' else 'N/A'}")
                source.last_refreshed_at = datetime.utcnow()
                source.source_metadata = {
                    **(source.source_metadata or {}),
                    "chunks_count": 0,
                    "last_processed": datetime.utcnow().isoformat(),
                    "processing_error": "Extracted text is empty",
                    "text_length": 0,
                    **metadata
                }
                self.db.commit()
                return 0
            
            text_length = len(text)
            logger.info(f"Source {source_id}: Extracted text length: {text_length} characters")
            
            # Удаляем старые chunks если они есть
            self.db.query(KnowledgeChunk).filter(KnowledgeChunk.source_id == source_id).delete()
            
            # Разбиваем текст на chunks
            chunks = self.text_chunker.split_text(text, metadata)
            logger.info(f"Source {source_id}: Created {len(chunks)} chunks from text")
            
            if not chunks:
                logger.warning(f"Source {source_id}: No chunks created from text (length: {text_length}). Text may be too short or empty after normalization.")
                source.last_refreshed_at = datetime.utcnow()
                source.source_metadata = {
                    **(source.source_metadata or {}),
                    "chunks_count": 0,
                    "last_processed": datetime.utcnow().isoformat(),
                    "processing_warning": "No chunks created - text may be too short",
                    "text_length": text_length,
                    **metadata
                }
                self.db.commit()
                return 0
            
            # Создаем embeddings и сохраняем chunks
            chunks_created = 0
            embedding_errors = 0
            for chunk_data in chunks:
                try:
                    # Генерируем embedding
                    embedding = await self.embedding_service.generate_embedding(chunk_data["content"])
                    
                    # Создаем chunk
                    chunk = KnowledgeChunk(
                        source_id=source_id,
                        content=chunk_data["content"],
                        content_type="text",
                        embedding=embedding,
                        chunk_metadata=chunk_data["metadata"]
                    )
                    
                    self.db.add(chunk)
                    chunks_created += 1
                except Exception as e:
                    embedding_errors += 1
                    logger.error(f"Source {source_id}: Failed to create embedding for chunk {chunks_created}: {str(e)}")
                    # Продолжаем обработку остальных chunks
                    continue
            
            # Обновляем метаданные источника
            source.last_refreshed_at = datetime.utcnow()
            source_metadata_update = {
                **(source.source_metadata or {}),
                "chunks_count": chunks_created,
                "last_processed": datetime.utcnow().isoformat(),
                "text_length": text_length,
                **metadata
            }
            
            if embedding_errors > 0:
                source_metadata_update["embedding_errors"] = embedding_errors
                logger.warning(f"Source {source_id}: {embedding_errors} chunks failed to create embeddings")
            
            source.source_metadata = source_metadata_update
            
            self.db.commit()
            
            if chunks_created == 0:
                logger.warning(f"Source {source_id}: No chunks were created. Total chunks from split: {len(chunks)}, Embedding errors: {embedding_errors}")
            
            logger.info(f"Source {source_id}: Successfully created {chunks_created} chunks")
            
            return chunks_created
        except Exception as e:
            self.db.rollback()
            raise KnowledgeSourceException(
                f"Failed to process source content: {str(e)}",
                details={"source_id": str(source_id), "error": str(e)}
            )
    
    async def refresh_source(self, source_id: UUID) -> int:
        """
        Обновить источник (перезагрузить и переобработать контент)
        
        Args:
            source_id: ID источника
        
        Returns:
            int: Количество созданных chunks
        """
        return await self.process_source_content(source_id)
    
    def delete_source(self, source_id: UUID) -> bool:
        """
        Удалить источник знаний
        
        Args:
            source_id: ID источника
        
        Returns:
            bool: True если удален успешно
        """
        try:
            source = self.db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
            
            if not source:
                raise KnowledgeSourceException(f"Source {source_id} not found")
            
            # Удаляем файл если это file source
            if source.source_type == "file" and source.file_path:
                file_path = Path(source.file_path)
                if file_path.exists():
                    file_path.unlink()
            
            # Удаляем источник (chunks удалятся каскадно)
            self.db.delete(source)
            self.db.commit()
            
            return True
        except Exception as e:
            self.db.rollback()
            raise KnowledgeSourceException(
                f"Failed to delete source: {str(e)}",
                details={"source_id": str(source_id), "error": str(e)}
            )
    
    def list_sources(
        self,
        active_only: bool = True,
        limit: int = 100,
        offset: int = 0
    ) -> List[KnowledgeSource]:
        """
        Получить список источников знаний
        
        Args:
            active_only: Только активные источники
            limit: Лимит результатов
            offset: Смещение
        
        Returns:
            List[KnowledgeSource]: Список источников
        """
        query = self.db.query(KnowledgeSource)
        
        if active_only:
            query = query.filter(KnowledgeSource.is_active == True)
        
        query = query.order_by(KnowledgeSource.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        return query.all()
    
    def get_source(self, source_id: UUID) -> Optional[KnowledgeSource]:
        """
        Получить источник по ID
        
        Args:
            source_id: ID источника
        
        Returns:
            Optional[KnowledgeSource]: Источник или None
        """
        return self.db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    
    def get_source_chunks(self, source_id: UUID, limit: int = 100) -> List[KnowledgeChunk]:
        """
        Получить chunks источника
        
        Args:
            source_id: ID источника
            limit: Лимит результатов
        
        Returns:
            List[KnowledgeChunk]: Список chunks
        """
        return self.db.query(KnowledgeChunk)\
            .filter(KnowledgeChunk.source_id == source_id)\
            .order_by(KnowledgeChunk.created_at)\
            .limit(limit)\
            .all()
    
    def update_source(
        self,
        source_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None,
        auto_refresh: Optional[bool] = None
    ) -> KnowledgeSource:
        """
        Обновить источник знаний
        
        Args:
            source_id: ID источника
            name: Новое название
            description: Новое описание
            is_active: Активность
            auto_refresh: Автообновление
        
        Returns:
            KnowledgeSource: Обновленный источник
        """
        try:
            source = self.get_source(source_id)
            
            if not source:
                raise KnowledgeSourceException(f"Source {source_id} not found")
            
            if name is not None:
                source.name = name
            if description is not None:
                source.description = description
            if is_active is not None:
                source.is_active = is_active
            if auto_refresh is not None:
                source.auto_refresh = auto_refresh
            
            self.db.commit()
            self.db.refresh(source)
            
            return source
        except Exception as e:
            self.db.rollback()
            raise KnowledgeSourceException(
                f"Failed to update source: {str(e)}",
                details={"source_id": str(source_id), "error": str(e)}
            )
