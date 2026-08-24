#!/usr/bin/env python3
"""Тест интеграции RAG + умных промптов."""

import sys
import os
sys.path.append('.')

from app.prompts import (
    detect_conversation_type, 
    get_context_aware_prompt, 
    format_rag_context,
    create_enhanced_system_prompt
)

def test_detect_conversation_type():
    """Тест определения типа разговора."""
    print("🧪 Тестируем определение типа разговора...")
    
    # Тест для анализа данных
    messages = [{"role": "user", "content": "Как создать отчет по продажам?"}]
    query = "Покажи метрики за последний месяц"
    
    result = detect_conversation_type(messages, query)
    print(f"   Результат для анализа данных: {result}")
    assert result == "data_analysis", f"Ожидался data_analysis, получен {result}"
    
    # Тест для код-ревью
    messages = [{"role": "user", "content": "Проверь мой код на ошибки"}]
    query = "Есть ли проблемы с производительностью?"
    
    result = detect_conversation_type(messages, query)
    print(f"   Результат для код-ревью: {result}")
    assert result == "code_review", f"Ожидался code_review, получен {result}"
    
    # Тест для бизнес-процессов
    messages = [{"role": "user", "content": "Как оптимизировать workflow?"}]
    query = "Документируй процесс"
    
    result = detect_conversation_type(messages, query)
    print(f"   Результат для бизнес-процессов: {result}")
    assert result == "business_process", f"Ожидался business_process, получен {result}"
    
    print("   ✅ Определение типа разговора работает корректно!")

def test_get_context_aware_prompt():
    """Тест получения контекстного промта."""
    print("\n🧪 Тестируем получение контекстного промта...")
    
    messages = [{"role": "user", "content": "Помоги с анализом данных"}]
    query = "Создай SQL запрос"
    
    prompt = get_context_aware_prompt(messages, query)
    print(f"   Получен промт длиной: {len(prompt)} символов")
    print(f"   Содержимое промта: {prompt[:100]}...")
    assert "анализ" in prompt.lower(), "Промт должен содержать ключевые слова"
    assert "данные" in prompt.lower(), "Промт должен содержать ключевые слова"
    
    print("   ✅ Контекстные промты работают корректно!")

def test_format_rag_context():
    """Тест форматирования RAG контекста."""
    print("\n🧪 Тестируем форматирование RAG контекста...")
    
    context_chunks = [
        {
            "content": "Для анализа данных используйте pandas",
            "role": "assistant",
            "relevance_score": 0.9
        },
        {
            "content": "SQL запросы должны быть оптимизированы",
            "role": "user", 
            "relevance_score": 0.8
        }
    ]
    
    formatted = format_rag_context(context_chunks)
    print(f"   Отформатированный контекст:\n{formatted}")
    
    assert "Фрагмент 1" in formatted
    assert "Фрагмент 2" in formatted
    assert "pandas" in formatted
    assert "SQL" in formatted
    
    print("   ✅ Форматирование RAG контекста работает корректно!")

def test_create_enhanced_system_prompt():
    """Тест создания улучшенного системного промта."""
    print("\n🧪 Тестируем создание улучшенного промта...")
    
    base_prompt = "Ты - эксперт по анализу данных."
    context_chunks = [
        {
            "content": "Используйте matplotlib для визуализации",
            "role": "assistant",
            "relevance_score": 0.9
        }
    ]
    
    enhanced = create_enhanced_system_prompt(base_prompt, context_chunks, "data_analysis")
    print(f"   Улучшенный промт длиной: {len(enhanced)} символов")
    
    assert "ВАЖНО" in enhanced
    assert "релевантной информацией" in enhanced
    assert "matplotlib" in enhanced
    assert "предыдущих разговоров" in enhanced
    
    print("   ✅ Создание улучшенного промта работает корректно!")

def test_integration():
    """Интеграционный тест всей системы."""
    print("\n🧪 Интеграционный тест RAG + умных промптов...")
    
    # Симулируем разговор об анализе данных
    messages = [
        {"role": "user", "content": "Помоги с анализом данных"},
        {"role": "assistant", "content": "Конечно! Что именно нужно проанализировать?"},
        {"role": "user", "content": "У меня есть данные о продажах"}
    ]
    query = "Создай SQL запрос для группировки по месяцам"
    
    # 1. Определяем тип разговора
    conversation_type = detect_conversation_type(messages, query)
    print(f"   Определен тип: {conversation_type}")
    
    # 2. Получаем контекстный промт
    context_prompt = get_context_aware_prompt(messages, query)
    print(f"   Получен контекстный промт: {len(context_prompt)} символов")
    
    # 3. Симулируем RAG контекст
    rag_context = [
        {
            "content": "Для группировки по месяцам используйте DATE_TRUNC('month', date_column)",
            "role": "assistant",
            "relevance_score": 0.95
        }
    ]
    
    # 4. Создаем финальный промт
    final_prompt = create_enhanced_system_prompt(context_prompt, rag_context, conversation_type)
    print(f"   Финальный промт: {len(final_prompt)} символов")
    
    # Проверяем, что все компоненты работают вместе
    assert conversation_type == "data_analysis"
    assert "анализ" in context_prompt.lower()
    assert "SQL" in final_prompt
    assert "DATE_TRUNC" in final_prompt
    
    print("   ✅ Интеграция RAG + умных промптов работает корректно!")

def main():
    """Запуск всех тестов."""
    print("🚀 Запуск тестов RAG + умных промптов\n")
    
    try:
        test_detect_conversation_type()
        test_get_context_aware_prompt()
        test_format_rag_context()
        test_create_enhanced_system_prompt()
        test_integration()
        
        print("\n🎉 Все тесты прошли успешно!")
        print("✅ RAG + умные промпты готовы к использованию!")
        
    except Exception as e:
        print(f"\n❌ Ошибка в тестах: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
