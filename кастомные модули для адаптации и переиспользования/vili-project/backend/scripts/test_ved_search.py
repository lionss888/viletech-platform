#!/usr/bin/env python3
"""
Скрипт для тестирования поиска по базе знаний ВЭД.

Использование:
    python -m scripts.test_ved_search [query]

Пример:
    python -m scripts.test_ved_search "таможенное оформление"
"""

import sys
import asyncio
from pathlib import Path
from uuid import UUID

# Добавляем корневую директорию backend в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.services.rag_service import RAGService
from app.services.knowledge_source_service import KnowledgeSourceService


async def test_ved_search(query: str, category: str = "ved"):
    """
    Тестировать поиск по базе знаний ВЭД
    
    Args:
        query: Поисковый запрос
        category: Категория для фильтрации
    """
    db: Session = SessionLocal()
    
    try:
        rag_service = RAGService(db)
        knowledge_service = KnowledgeSourceService(db)
        
        print(f"🔍 Поиск по запросу: '{query}'")
        print(f"📂 Категория: {category}")
        print("-" * 60)
        
        # Ищем источники с категорией ВЭД
        sources = knowledge_service.list_sources(active_only=True)
        ved_sources = [s for s in sources if s.category == category]
        
        if not ved_sources:
            print(f"⚠️  Не найдено источников знаний с категорией '{category}'")
            print("\nДоступные источники:")
            for source in sources:
                print(f"  - {source.name} (категория: {source.category or 'не указана'})")
            return
        
        print(f"✅ Найдено источников ВЭД: {len(ved_sources)}")
        for source in ved_sources:
            chunks_count = len(knowledge_service.get_source_chunks(source.id))
            print(f"   - {source.name}: {chunks_count} chunks")
        
        print("\n" + "=" * 60)
        print("Результаты поиска:")
        print("=" * 60)
        
        # Выполняем поиск
        results = await rag_service.search_knowledge(
            query=query,
            top_k=5,
            min_similarity=0.5,
            category=category
        )
        
        if not results:
            print("❌ Результаты не найдены")
            print("\nПопробуйте:")
            print("  - Уменьшить min_similarity")
            print("  - Использовать другие ключевые слова")
            print("  - Проверить, что импорт PDF завершен успешно")
            return
        
        print(f"✅ Найдено результатов: {len(results)}\n")
        
        for i, result in enumerate(results, 1):
            print(f"[Результат {i}]")
            print(f"Источник: {result.get('source_name', 'Unknown')}")
            print(f"Релевантность: {result.get('similarity', 0):.2%}")
            print(f"Категория: {result.get('category', 'N/A')}")
            print(f"\nКонтент (первые 200 символов):")
            content = result.get('content', '')
            print(f"{content[:200]}...")
            print("-" * 60)
            print()
        
        # Тестируем без фильтра категории для сравнения
        print("\n" + "=" * 60)
        print("Сравнение: поиск без фильтра категории")
        print("=" * 60)
        
        results_all = await rag_service.search_knowledge(
            query=query,
            top_k=5,
            min_similarity=0.5,
            category=None  # Без фильтра
        )
        
        print(f"Найдено результатов (все категории): {len(results_all)}")
        if results_all:
            categories = set(r.get('category') for r in results_all if r.get('category'))
            print(f"Категории в результатах: {', '.join(categories) or 'нет'}")
        
    except Exception as e:
        print(f"❌ Ошибка при поиске: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


def main():
    """Главная функция скрипта"""
    if len(sys.argv) < 2:
        # Тестовые запросы по умолчанию
        test_queries = [
            "таможенное оформление",
            "валютное регулирование",
            "экспорт импорт",
            "внешнеэкономическая деятельность"
        ]
        
        print("📝 Тестовые запросы по ВЭД:")
        for i, q in enumerate(test_queries, 1):
            print(f"  {i}. {q}")
        print()
        
        query = test_queries[0]  # Используем первый по умолчанию
        print(f"Используется запрос: '{query}'")
        print("(Укажите свой запрос как аргумент: python -m scripts.test_ved_search 'ваш запрос')\n")
    else:
        query = sys.argv[1]
    
    # Запускаем тест
    try:
        asyncio.run(test_ved_search(query))
        print("\n✅ Тест завершен")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
