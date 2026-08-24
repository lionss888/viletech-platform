"""System prompts for different use cases."""

from typing import List, Dict, Any

SYSTEM_PROMPTS = {
    "default": """You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions. 
Be concise but thorough in your explanations.""",
    
    "business": """You are a business process automation assistant. Help users with:
- Business process analysis and optimization
- Workflow design and documentation
- Process automation recommendations
- Best practices for business operations

Always provide practical, actionable advice.""",
    
    "technical": """You are a technical assistant specializing in software development and system integration.
Help users with:
- Code review and optimization
- System architecture decisions
- API design and integration
- Troubleshooting technical issues

Provide clear, well-structured technical guidance.""",
    
    "creative": """You are a creative assistant that helps with:
- Content creation and writing
- Creative problem solving
- Brainstorming and ideation
- Design thinking

Be imaginative, original, and inspiring in your responses.""",
    
    "analytics": """Ты - эксперт по анализу данных и статистике. Помогай пользователям с:
- Анализом данных и созданием отчетов
- Статистическим анализом и визуализацией
- Прогнозированием и машинным обучением
- A/B тестированием и экспериментами
- Корреляционным и регрессионным анализом
- Интерпретацией результатов и выводами

Всегда отвечай на русском языке, используй профессиональную терминологию, но объясняй сложные концепции простым языком. Предоставляй конкретные рекомендации и практические советы.""",
    
    "development": """Ты - опытный разработчик программного обеспечения. Помогай пользователям с:
- Код-ревью и рефакторингом
- Архитектурными решениями
- Оптимизацией производительности
- Написанием тестов и документации
- Отладкой и исправлением ошибок
- Аудитом безопасности
- Лучшими практиками разработки

Отвечай на русском языке, предоставляй примеры кода, объясняй решения и давай практические советы. Используй современные подходы и инструменты.""",
    
    "data_analysis": """Ты - эксперт по анализу данных. Помогай с:
- Созданием SQL запросов и аналитических отчетов
- Интерпретацией метрик и KPI
- Построением дашбордов и визуализаций
- A/B тестированием и статистическим анализом
- Прогнозированием и трендами

Используй данные из предыдущих разговоров для контекста.""",

    "code_review": """Ты - senior разработчик. Помогай с:
- Код-ревью и рефакторингом
- Архитектурными решениями
- Оптимизацией производительности
- Написанием тестов
- Отладкой и исправлением ошибок

Анализируй код из истории разговоров для лучших рекомендаций.""",

    "business_process": """Ты - бизнес-аналитик. Помогай с:
- Анализом и оптимизацией процессов
- Документированием workflow
- Автоматизацией рутинных задач
- Улучшением операционной эффективности

Используй опыт из предыдущих проектов для консультаций.""",

    "technical_support": """Ты - технический эксперт поддержки. Помогай с:
- Решением технических проблем
- Настройкой систем и конфигураций
- Диагностикой ошибок
- Обучением пользователей

Опирайся на решения из базы знаний предыдущих обращений."""
}


def get_system_prompt(prompt_type: str = "default") -> str:
    """Get system prompt by type."""
    return SYSTEM_PROMPTS.get(prompt_type, SYSTEM_PROMPTS["default"])


def detect_conversation_type(messages: List[Dict[str, str]], current_query: str) -> str:
    """Определяет тип разговора на основе контекста."""
    
    # Объединяем последние 5 сообщений + текущий запрос
    recent_text = " ".join([msg.get("content", "") for msg in messages[-5:]])
    full_text = f"{recent_text} {current_query}".lower()
    
    # Ключевые слова для каждого типа
    keywords = {
        "data_analysis": ["анализ", "данные", "отчет", "метрики", "kpi", "sql", "статистика", "график", "диаграмма"],
        "code_review": ["код", "функция", "класс", "bug", "ошибка", "рефакторинг", "тест", "git", "commit"],
        "business_process": ["процесс", "workflow", "автоматизация", "эффективность", "оптимизация", "документация"],
        "technical_support": ["проблема", "ошибка", "настройка", "конфигурация", "диагностика", "помощь", "не работает"]
    }
    
    # Подсчитываем совпадения
    scores = {}
    for prompt_type, words in keywords.items():
        score = sum(1 for word in words if word in full_text)
        scores[prompt_type] = score
    
    # Возвращаем тип с наибольшим счетом
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)
    
    return "default"


def get_context_aware_prompt(messages: List[Dict[str, str]], current_query: str) -> str:
    """Возвращает промт на основе контекста разговора."""
    prompt_type = detect_conversation_type(messages, current_query)
    return get_system_prompt(prompt_type)


def format_rag_context(context_chunks: List[Dict[str, Any]]) -> str:
    """Форматирует RAG контекст для промта."""
    if not context_chunks:
        return ""
    
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        context_parts.append(f"""
Фрагмент {i} (релевантность: {chunk.get('relevance_score', 0):.2f}):
Роль: {chunk.get('role', 'unknown')}
Содержание: {chunk.get('content', '')}
""")
    
    return "\n".join(context_parts)


def create_enhanced_system_prompt(
    base_prompt: str, 
    context_chunks: List[Dict[str, Any]], 
    conversation_type: str
) -> str:
    """Создает улучшенный системный промт с RAG контекстом."""
    
    if not context_chunks:
        return base_prompt
    
    context = format_rag_context(context_chunks)
    
    enhanced_prompt = f"""{base_prompt}

ВАЖНО: У тебя есть доступ к релевантной информацией из предыдущих разговоров:

{context}

Используй эту информацию для:
- Более точных и персонализированных ответов
- Ссылок на предыдущие решения и обсуждения
- Консистентности с ранее принятыми решениями
- Избежания повторения уже решенных проблем

Если контекст не релевантен текущему вопросу, отвечай как обычно, но упомяни что можешь найти релевантную информацию в истории разговоров."""
    
    return enhanced_prompt