# API Документация Ollama BP Automation

## 📋 Обзор

RESTful API для интеграции с Ollama моделями и автоматизации бизнес-процессов.

**Base URL:** `http://localhost:8000`  
**Версия:** v1  
**Формат:** JSON

## 🔗 Endpoints

### Health Checks

#### `GET /v1/health`
Проверка состояния API сервера.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T15:00:00.000Z"
}
```

#### `GET /v1/health/ollama`
Проверка состояния Ollama сервера.

**Ответ:**
```json
{
  "ok": true,
  "host": "http://localhost:11434",
  "latency_ms": 15,
  "error": null
}
```

**Ошибка:**
```json
{
  "ok": false,
  "host": "http://localhost:11434",
  "error": "Connection timeout"
}
```

#### `GET /v1/health/db`
Проверка состояния базы данных.

**Ответ:**
```json
{
  "ok": true,
  "latency_ms": 25,
  "error": null
}
```

**Ошибка:**
```json
{
  "ok": false,
  "error": "Connection failed"
}
```

### Models

#### `GET /v1/models`
Получить список доступных моделей.

**Ответ:**
```json
{
  "models": [
    {
      "name": "llama3.2:3b-instruct-q4_0",
      "size": 1917206179,
      "modified_at": "2025-01-01T15:00:00.000Z"
    },
    {
      "name": "codellama:7b-instruct-q4_0",
      "size": 3825910662,
      "modified_at": "2025-01-01T15:00:00.000Z"
    }
  ]
}
```

### Chat

#### `POST /v1/ask`
Отправить сообщение в чат.

**Запрос:**
```json
{
  "model": "llama3.2:3b-instruct-q4_0",
  "messages": [
    {
      "role": "user",
      "content": "Привет! Как дела?"
    }
  ],
  "convo_id": "chat-123",
  "stream": false,
  "system_prompt_type": "default"
}
```

**Ответ (stream=false):**
```json
{
  "model": "llama3.2:3b-instruct-q4_0",
  "message": {
    "role": "assistant",
    "content": "Привет! У меня все хорошо, спасибо за вопрос!"
  },
  "conversation_id": "chat-123",
  "request_id": "req-456"
}
```

**Потоковый ответ (stream=true):**
```
data: {"model": "llama3.2:3b-instruct-q4_0", "message": {"role": "assistant", "content": "Привет!"}, "done": false, "request_id": "req-456"}

data: {"model": "llama3.2:3b-instruct-q4_0", "message": {"role": "assistant", "content": " У меня все хорошо!"}, "done": false, "request_id": "req-456"}

data: {"model": "llama3.2:3b-instruct-q4_0", "message": {"role": "assistant", "content": " Спасибо за вопрос!"}, "done": true, "request_id": "req-456"}
```

### AssistChat

#### `POST /v1/assist/parse`
Парсинг текста с помощью AI для структурированного вывода.

**Запрос:**
```json
{
  "text": "Нужна доставка из Москвы в СПб, 50кг, срочно",
  "model": "llama3.2:3b-instruct-q4_0",
  "prompt_override": "Извлеки данные о доставке в JSON формате",
  "gen_opts": {
    "temperature": 0.7,
    "max_tokens": 500
  },
  "convo_id": "assist-123"
}
```

**Ответ:**
```json
{
  "parsed_data": {
    "from_city": "Москва",
    "to_city": "СПб",
    "weight": "50кг",
    "urgency": "срочно",
    "service_type": "доставка"
  },
  "confidence": 0.95,
  "model_used": "llama3.2:3b-instruct-q4_0",
  "request_id": "req-789",
  "conversation_id": "assist-123"
}
```

### Releases

#### `GET /v1/releases`
Получить список релизов.

**Параметры:**
- `limit` (int, optional): Количество записей (по умолчанию 50)
- `offset` (int, optional): Смещение (по умолчанию 0)
- `status` (string, optional): Фильтр по статусу

**Ответ:**
```json
{
  "releases": [
    {
      "id": "1",
      "name": "myco/ops-logistics",
      "version": "1.0.0",
      "status": "stable",
      "created_at": "2025-01-01T15:00:00.000Z",
      "updated_at": "2025-01-01T15:00:00.000Z",
      "description": "Initial release",
      "metadata": {
        "changelog": "First stable release"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### `GET /v1/releases/{release_id}`
Получить конкретный релиз.

**Ответ:**
```json
{
  "release": {
    "id": "1",
    "name": "myco/ops-logistics",
    "version": "1.0.0",
    "status": "stable",
    "created_at": "2025-01-01T15:00:00.000Z",
    "updated_at": "2025-01-01T15:00:00.000Z",
    "description": "Release details",
    "metadata": {
      "changelog": "Detailed changelog"
    }
  }
}
```

### History

#### `GET /v1/history`
Получить историю сообщений.

**Параметры:**
- `convo_id` (string, required): ID беседы
- `limit` (int, optional): Количество записей (по умолчанию 50)
- `offset` (int, optional): Смещение (по умолчанию 0)

**Ответ:**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "created_at": "2025-01-01T15:00:00.000Z",
      "convo_id": "chat-123",
      "role": "user",
      "content": "Привет!",
      "meta": {
        "request_id": "req-456"
      }
    },
    {
      "id": "msg-124",
      "created_at": "2025-01-01T15:00:01.000Z",
      "convo_id": "chat-123",
      "role": "assistant",
      "content": "Привет! Как дела?",
      "meta": {
        "request_id": "req-456",
        "model": "llama3.2:3b-instruct-q4_0"
      }
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0,
  "conversation_id": "chat-123"
}
```

### Model Evaluation

#### `POST /v1/eval`
Запустить оценку модели.

**Запрос:**
```json
{
  "model_tag": "myco/ops-logistics:1.1.0-rc1",
  "data_file": "tests/evals/sample.jsonl",
  "metrics": ["accuracy", "latency", "throughput"]
}
```

**Ответ:**
```json
{
  "model_tag": "myco/ops-logistics:1.1.0-rc1",
  "metrics": {
    "accuracy": 0.95,
    "latency": 1.2,
    "throughput": 10.5
  },
  "total_samples": 100,
  "completed_at": "2025-01-01T15:00:00.000Z",
  "request_id": "eval-123"
}
```

## 📊 Схемы данных

### ChatMessage
```json
{
  "role": "user|assistant|system",
  "content": "string"
}
```

### ChatRequest
```json
{
  "model": "string",
  "messages": [ChatMessage],
  "convo_id": "string",
  "stream": "boolean",
  "system_prompt_type": "string"
}
```

### AssistParseRequest
```json
{
  "text": "string",
  "model": "string (optional)",
  "prompt_override": "string (optional)",
  "gen_opts": "object (optional)",
  "convo_id": "string"
}
```

### ReleaseInfo
```json
{
  "id": "string",
  "name": "string",
  "version": "string",
  "status": "stable|candidate|beta|alpha",
  "created_at": "datetime",
  "updated_at": "datetime",
  "description": "string (optional)",
  "metadata": "object (optional)"
}
```

## 🔄 Потоковый формат (SSE)

### Заголовки
```
Content-Type: text/plain
Cache-Control: no-cache
Connection: keep-alive
```

### Формат данных
```
data: {"model": "model-name", "message": {"role": "assistant", "content": "text"}, "done": false, "request_id": "req-123"}

data: {"model": "model-name", "message": {"role": "assistant", "content": " more text"}, "done": false, "request_id": "req-123"}

data: {"model": "model-name", "message": {"role": "assistant", "content": " final text"}, "done": true, "request_id": "req-123"}
```

### Обработка ошибок
```
data: {"error": {"type": "stream_error", "message": "Error description", "request_id": "req-123"}}
```

## 🚨 Коды ошибок

| Код | Описание | Пример |
|-----|----------|--------|
| 400 | Bad Request | Неверный формат запроса |
| 422 | Validation Error | Ошибка валидации данных |
| 500 | Internal Server Error | Внутренняя ошибка сервера |
| 502 | Bad Gateway | Ошибка Ollama |
| 503 | Service Unavailable | Сервис недоступен |

### Формат ошибки
```json
{
  "error": {
    "type": "validation_error",
    "message": "Field 'model' is required",
    "details": {
      "field": "model",
      "code": "missing"
    }
  },
  "request_id": "req-123"
}
```

## 🔐 Аутентификация

### Request ID
Каждый запрос должен содержать заголовок `X-Request-ID`:

```bash
curl -H "X-Request-ID: req-123" \
  http://localhost:8000/v1/health
```

### CORS
API поддерживает CORS для веб-клиентов:

```bash
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:8000/v1/ask
```

## 📈 Rate Limiting

### Лимиты
- **Chat requests:** 100 запросов/минуту
- **Assist parse:** 50 запросов/минуту
- **Health checks:** 1000 запросов/минуту

### Заголовки ответа
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🧪 Примеры использования

### JavaScript (Fetch)
```javascript
// Отправка сообщения
const response = await fetch('http://localhost:8000/v1/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID()
  },
  body: JSON.stringify({
    model: 'llama3.2:3b-instruct-q4_0',
    messages: [{ role: 'user', content: 'Привет!' }],
    convo_id: 'chat-123',
    stream: false
  })
});

const data = await response.json();
console.log(data.message.content);
```

### Python (httpx)
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        'http://localhost:8000/v1/ask',
        json={
            'model': 'llama3.2:3b-instruct-q4_0',
            'messages': [{'role': 'user', 'content': 'Привет!'}],
            'convo_id': 'chat-123',
            'stream': False
        },
        headers={'X-Request-ID': 'req-123'}
    )
    
    data = response.json()
    print(data['message']['content'])
```

### cURL
```bash
# Простой чат
curl -X POST http://localhost:8000/v1/ask \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: req-123" \
  -d '{
    "model": "llama3.2:3b-instruct-q4_0",
    "messages": [{"role": "user", "content": "Привет!"}],
    "convo_id": "chat-123",
    "stream": false
  }'

# AssistChat парсинг
curl -X POST http://localhost:8000/v1/assist/parse \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: req-456" \
  -d '{
    "text": "Нужна доставка из Москвы в СПб, 50кг, срочно",
    "convo_id": "assist-123"
  }'

# Потоковый чат
curl -X POST http://localhost:8000/v1/ask \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: req-789" \
  -d '{
    "model": "llama3.2:3b-instruct-q4_0",
    "messages": [{"role": "user", "content": "Расскажи историю"}],
    "convo_id": "chat-456",
    "stream": true
  }'
```

---

**Последнее обновление:** 1 января 2025  
**Версия API:** v1.0