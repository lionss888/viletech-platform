#!/usr/bin/env python3
"""
Скрипт для импорта PDF документа по ВЭД в базу знаний.

Использование:
    python -m scripts.import_ved_knowledge [path_to_pdf]

Пример:
    python -m scripts.import_ved_knowledge "../VED task.pdf"
"""

import sys
import os
import asyncio
from pathlib import Path
from uuid import UUID
from typing import Optional
from tempfile import SpooledTemporaryFile

# Добавляем корневую директорию backend в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.services.knowledge_source_service import KnowledgeSourceService
from app.core.config import settings


async def import_ved_pdf(
    pdf_path: str,
    name: str = "Методология ВЭД",
    description: str = "Академические знания и методология по внешнеэкономической деятельности",
    category: str = "ved",
    created_by: Optional[UUID] = None
) -> UUID:
    """
    Импортировать PDF документ по ВЭД в базу знаний
    
    Args:
        pdf_path: Путь к PDF файлу
        name: Название источника знаний
        description: Описание источника
        category: Категория знаний (ved/compliance)
        created_by: ID пользователя-создателя (опционально)
    
    Returns:
        UUID: ID созданного источника знаний
    """
    pdf_file = Path(pdf_path)
    
    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF файл не найден: {pdf_path}")
    
    if pdf_file.suffix.lower() != ".pdf":
        raise ValueError(f"Файл должен быть PDF: {pdf_path}")
    
    print(f"📄 Загрузка PDF: {pdf_file.name} ({pdf_file.stat().st_size / 1024 / 1024:.2f} MB)")
    
    # Создаем сессию БД
    db: Session = SessionLocal()
    
    try:
        service = KnowledgeSourceService(db)
        
        # Читаем файл в память и создаем UploadFile
        with open(pdf_file, "rb") as f:
            file_content = f.read()
        
        # Создаем SpooledTemporaryFile для UploadFile
        spooled_file = SpooledTemporaryFile(max_size=10 * 1024 * 1024)  # 10MB
        spooled_file.write(file_content)
        spooled_file.seek(0)
        
        upload_file = UploadFile(
            filename=pdf_file.name,
            file=spooled_file
        )
        
        print(f"🔄 Обработка файла и создание embeddings...")
        
        # Добавляем источник знаний
        source = await service.add_file_source(
            name=name,
            file=upload_file,
            description=description,
            created_by=created_by,
            category=category,
            owner_only=False
        )
        
        # Обновляем метаданные с расширенной информацией
        if source.source_metadata is None:
            source.source_metadata = {}
        
        source.source_metadata.update({
            "domain": "compliance",
            "document_type": "methodology",
            "source_name": "Методология ВЭД",
            "imported_by_script": True
        })
        
        db.commit()
        db.refresh(source)
        
        # Получаем количество chunks
        chunks = service.get_source_chunks(source.id)
        chunks_count = len(chunks)
        
        print(f"✅ Импорт завершен успешно!")
        print(f"   ID источника: {source.id}")
        print(f"   Название: {source.name}")
        print(f"   Категория: {source.category}")
        print(f"   Создано chunks: {chunks_count}")
        print(f"   Файл: {source.file_path}")
        
        return source.id
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при импорте: {str(e)}", file=sys.stderr)
        raise
    finally:
        db.close()


def main():
    """Главная функция скрипта"""
    if len(sys.argv) < 2:
        # Пробуем найти файл в корне проекта
        project_root = Path(__file__).parent.parent.parent
        pdf_path = project_root / "VED task.pdf"
        
        if not pdf_path.exists():
            print("❌ Укажите путь к PDF файлу:")
            print(f"   python -m scripts.import_ved_knowledge <path_to_pdf>")
            print(f"\nИли поместите файл 'VED task.pdf' в корень проекта: {project_root}")
            sys.exit(1)
    else:
        pdf_path = sys.argv[1]
    
    # Запускаем импорт
    try:
        source_id = asyncio.run(import_ved_pdf(pdf_path))
        print(f"\n🎉 Источник знаний создан: {source_id}")
        print(f"\nТеперь можно использовать RAG поиск по категории 'ved'")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
