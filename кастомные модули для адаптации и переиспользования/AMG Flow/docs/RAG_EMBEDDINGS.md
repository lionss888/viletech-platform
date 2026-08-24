# 🧠 RAG система с реальными Embeddings

## 📋 Обзор

AMG-Flow теперь использует реальные embeddings через Ollama API и персистентное векторное хранилище ChromaDB для эффективного поиска релевантного контекста.

## 🚀 Новые возможности

### ✅ **Реальные Embeddings**
- Интеграция с Ollama embeddings API
- Поддержка моделей: `nomic-embed-text`, `mxbai-embed-large`
- Кэширование embeddings для производительности
- Пакетная обработка для эффективности

### ✅ **Векторное хранилище**
- ChromaDB для персистентного хранения
- Автоматическое разбиение текста на чанки
- Семантический поиск по сходству
- Фильтрация по метаданным

### ✅ **Улучшенная RAG система**
- Асинхронная обработка
- Умное разбиение длинных сообщений
- Контекстное улучшение промптов
- Управление через API

## 🛠️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI API   │    │   Ollama API    │    │   ChromaDB      │
│                 │◄──►│   (Embeddings)  │◄──►│   (Vector Store)│
│   RAG System    │    │   Port: 11434   │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Установка и настройка

### 1. Обновление зависимостей

```bash
# Установить новые зависимости
pip install chromadb>=0.4.0 sentence-transformers>=2.2.0
```

### 2. Запуск с Docker

```bash
# Запустить все сервисы включая ChromaDB
docker compose up --build

# Или только для разработки
make dev
```

### 3. Настройка Embeddings модели

```bash
# Автоматическая установка
make embeddings-setup

# Или вручную
ollama pull nomic-embed-text
```

## 🔧 API эндпоинты

### Управление RAG системой

#### Получить статистику
```bash
GET /v1/learning/rag/stats
```

#### Добавить разговор
```bash
POST /v1/learning/rag/add-conversation?convo_id=conv123&limit=100
```

#### Удалить разговор
```bash
DELETE /v1/learning/rag/conversation/conv123
```

#### Сбросить систему
```bash
POST /v1/learning/rag/reset
```

#### Поиск контекста
```bash
GET /v1/learning/rag/search?query=test&top_k=5&min_relevance=0.7
```

### Использование в чате

```bash
POST /v1/ask
{
  "model": "llama3.2:3b-instruct-q4_0",
  "messages": [{"role": "user", "content": "Привет!"}],
  "convo_id": "test-123",
  "use_rag": true
}
```

## 🎯 Примеры использования

### 1. Добавление разговора в RAG

```bash
# Через Makefile
make add-to-rag CONVO_ID=my-conversation

# Через curl
curl -X POST "http://localhost:8000/v1/learning/rag/add-conversation?convo_id=my-conversation"
```

### 2. Поиск релевантного контекста

```bash
# Через Makefile
make rag-search QUERY="как настроить базу данных"

# Через curl
curl "http://localhost:8000/v1/learning/rag/search?query=настройка&top_k=3"
```

### 3. Использование RAG в чате

```python
import requests

# Отправить сообщение с RAG
response = requests.post("http://localhost:8000/v1/ask", json={
    "model": "llama3.2:3b-instruct-q4_0",
    "messages": [{"role": "user", "content": "Как настроить PostgreSQL?"}],
    "convo_id": "help-123",
    "use_rag": True
})

print(response.json())
```

## ⚙️ Конфигурация

### Переменные окружения

```bash
# Ollama настройки
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text

# ChromaDB настройки (автоматические)
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

### Настройки RAG системы

```python
# В app/learning/rag_system.py
class RAGSystem:
    def __init__(self):
        self.chunk_size = 500      # Размер чанка в символах
        self.chunk_overlap = 50    # Перекрытие между чанками
```

## 📊 Мониторинг

### Статистика системы

```bash
# Получить полную статистику
make rag-stats

# Результат:
{
  "vector_store": {
    "total_documents": 150,
    "collection_name": "rag_documents"
  },
  "embeddings_cache": {
    "cached_embeddings": 45,
    "model": "nomic-embed-text"
  },
  "chunk_size": 500,
  "chunk_overlap": 50
}
```

### Логи

```bash
# Просмотр логов RAG системы
docker compose logs api | grep "RAG\|embedding\|vector"

# Примеры логов:
# INFO: Added 12 chunks from 3 messages in conversation conv123
# DEBUG: Found 3 relevant chunks for query: как настроить...
# INFO: Enhanced prompt with 3 context chunks
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Тесты RAG системы
pytest tests/test_rag_embeddings.py -v

# Все тесты
make test
```

### Тестирование вручную

```bash
# 1. Проверить статус системы
curl http://localhost:8000/v1/learning/rag/stats

# 2. Добавить тестовый разговор
curl -X POST "http://localhost:8000/v1/learning/rag/add-conversation?convo_id=test"

# 3. Поиск контекста
curl "http://localhost:8000/v1/learning/rag/search?query=test"

# 4. Использовать в чате
curl -X POST http://localhost:8000/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2:3b-instruct-q4_0", "messages": [{"role": "user", "content": "test"}], "convo_id": "test", "use_rag": true}'
```

## 🔧 Устранение неполадок

### Проблема: Embeddings не генерируются

```bash
# Проверить Ollama
curl http://localhost:11434/api/tags

# Проверить модель embeddings
curl -X POST http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "test"}'

# Переустановить модель
ollama pull nomic-embed-text
```

### Проблема: ChromaDB недоступен

```bash
# Проверить статус
docker compose ps chroma

# Перезапустить
docker compose restart chroma

# Проверить логи
docker compose logs chroma
```

### Проблема: Медленный поиск

```bash
# Очистить кэш embeddings
curl -X POST http://localhost:8000/v1/learning/rag/reset

# Проверить размер векторного хранилища
curl http://localhost:8000/v1/learning/rag/stats
```

## 📈 Производительность

### Оптимизация

1. **Кэширование**: Embeddings кэшируются автоматически
2. **Пакетная обработка**: Множественные тексты обрабатываются параллельно
3. **Чанкинг**: Длинные тексты разбиваются на оптимальные части
4. **Фильтрация**: Поиск можно ограничить по разговорам

### Рекомендации

- Используйте `use_rag=true` только когда нужен контекст
- Регулярно очищайте старые разговоры
- Мониторьте размер векторного хранилища
- Используйте подходящие модели embeddings

## 🚀 Следующие шаги

1. **Гибридный поиск**: Комбинация семантического и ключевого поиска
2. **Автоматическое обновление**: Инкрементальное добавление новых сообщений
3. **A/B тестирование**: Сравнение качества с/без RAG
4. **Метрики качества**: Оценка релевантности найденного контекста

---

**Версия:** 2.0.0  
**Дата обновления:** Январь 2025
