# VILI API Документация

## Обзор

VILI Payment Assistant API предоставляет полный набор endpoints для работы с платежными документами, compliance проверками и оценкой рисков.

**Версия:** 1.0.0  
**База URL:** `http://localhost:8000`  
**Документация:** `http://localhost:8000/api/docs`

---

## Основные модули

### 1. Documents API

Управление платежными документами и их анализ.

#### Загрузка документа

```http
POST /api/v1/documents/upload
```

**Parameters:**
- `file` (multipart/form-data) - Файл документа
- `document_type` (query) - Тип: 'traditional' или 'crypto'
- `customer_id` (query) - UUID клиента

**Response:**
```json
{
  "document_id": "uuid",
  "status": "pending",
  "format": "SWIFT",
  "type": "traditional",
  "message": "Document uploaded successfully"
}
```

#### Анализ документа

```http
POST /api/v1/documents/{document_id}/analyze
```

**Request Body:**
```json
{
  "document_type": "traditional",
  "include_compliance": false,
  "include_risk": false,
  "use_rag": true
}
```

**Response:**
```json
{
  "document_id": "uuid",
  "status": "completed",
  "analysis": {},
  "confidence": 0.85,
  "entities": [],
  "sentiment": "neutral",
  "processing_time_ms": 1500
}
```

#### Список документов

```http
GET /api/v1/documents/?skip=0&limit=100&status=completed
```

**Response:**
```json
{
  "total": 10,
  "documents": [...],
  "skip": 0,
  "limit": 100
}
```

#### Получить документ

```http
GET /api/v1/documents/{document_id}
```

#### Удалить документ

```http
DELETE /api/v1/documents/{document_id}
```

#### Результаты анализа

```http
GET /api/v1/documents/{document_id}/analysis
```

---

### 2. Compliance API

Проверки соответствия регуляторным требованиям.

#### Запустить проверку

```http
POST /api/v1/compliance/check
```

**Request Body:**
```json
{
  "document_id": "uuid",
  "check_types": ["sanctions", "kyc", "aml", "travel_rule", "fatf"],
  "use_rag": true
}
```

**Response:**
```json
{
  "document_id": "uuid",
  "status": "passed",
  "overall_risk_level": "low",
  "checks": [
    {
      "type": "sanctions",
      "status": "passed",
      "risk_level": "low",
      "details": {},
      "confidence": 0.85,
      "findings": [],
      "recommendations": []
    }
  ],
  "processing_time_ms": 2000,
  "timestamp": "2024-01-01T12:00:00"
}
```

#### Получить результаты проверок

```http
GET /api/v1/compliance/{document_id}
```

**Response:**
```json
{
  "document_id": "uuid",
  "checks": [...],
  "overall_status": "passed",
  "summary": {
    "total_checks": 3,
    "by_status": {"passed": 2, "warning": 1},
    "by_risk_level": {"low": 2, "medium": 1}
  }
}
```

#### Статистика compliance

```http
GET /api/v1/compliance/statistics
```

**Response:**
```json
{
  "total_checks": 150,
  "passed": 120,
  "failed": 10,
  "warnings": 15,
  "pending": 5,
  "by_type": {
    "sanctions": 50,
    "kyc": 50,
    "aml": 50
  },
  "by_risk_level": {
    "low": 100,
    "medium": 30,
    "high": 15,
    "critical": 5
  }
}
```

---

### 3. Risk API

Оценка рисков платежных операций.

#### Оценить риски

```http
POST /api/v1/risk/assess
```

**Request Body:**
```json
{
  "document_id": "uuid",
  "include_economic_indices": true,
  "use_rag": true,
  "country_codes": ["USA", "RUS", "CHN"]
}
```

**Response:**
```json
{
  "document_id": "uuid",
  "status": "completed",
  "risk_score": 0.45,
  "risk_level": "medium",
  "recommendation": "review",
  "confidence": 0.82,
  "factors": [
    {
      "name": "Financial Risk",
      "category": "financial",
      "weight": 0.3,
      "score": 0.36,
      "description": "Оценка финансового риска",
      "severity": "medium"
    }
  ],
  "economic_indices": [
    {
      "country_code": "USA",
      "index_type": "economic_freedom",
      "value": 75.5,
      "year": 2024,
      "impact": "positive"
    }
  ],
  "analysis": {},
  "mitigations": ["Провести дополнительную проверку KYC"],
  "processing_time_ms": 2500,
  "timestamp": "2024-01-01T12:00:00"
}
```

#### Получить оценку рисков

```http
GET /api/v1/risk/{document_id}
```

#### История оценок

```http
GET /api/v1/risk/{document_id}/history?limit=10
```

#### Статистика рисков

```http
GET /api/v1/risk/statistics
```

**Response:**
```json
{
  "total_assessments": 200,
  "average_risk_score": 0.35,
  "by_risk_level": {
    "low": 120,
    "medium": 50,
    "high": 25,
    "critical": 5
  },
  "by_recommendation": {
    "approve": 150,
    "reject": 10,
    "review": 35,
    "request_info": 5
  },
  "trend": "stable"
}
```

#### Экономические индексы

```http
GET /api/v1/risk/economic-indices/{country_code}?year=2024
```

**Response:**
```json
{
  "country_code": "USA",
  "total": 5,
  "indices": [
    {
      "id": "uuid",
      "index_type": "economic_freedom",
      "value": 75.5,
      "year": 2024,
      "source": "Heritage Foundation",
      "updated_at": "2024-01-01T12:00:00"
    }
  ]
}
```

---

### 4. Knowledge Sources API

Управление источниками знаний для RAG.

```http
GET    /api/v1/knowledge-sources/
POST   /api/v1/knowledge-sources/
GET    /api/v1/knowledge-sources/{id}
PUT    /api/v1/knowledge-sources/{id}
DELETE /api/v1/knowledge-sources/{id}
POST   /api/v1/knowledge-sources/{id}/refresh
POST   /api/v1/knowledge-sources/upload
GET    /api/v1/knowledge-sources/{id}/chunks
```

---

### 5. Health & Feedback API

```http
GET /api/v1/health
GET /api/v1/health/detailed
POST /api/v1/feedback
GET  /api/v1/feedback
```

---

## Типы данных

### Document Types
- `traditional` - Традиционные банковские платежи
- `crypto` - Криптовалютные транзакции

### Document Formats
- `SWIFT` - SWIFT сообщения
- `PDF` - PDF документы
- `JSON` - JSON данные
- `XML` - XML документы
- `TXT` - Текстовые файлы

### Compliance Check Types
- `sanctions` - Проверка санкционных списков
- `kyc` - Know Your Customer
- `aml` - Anti Money Laundering
- `travel_rule` - Travel Rule compliance
- `fatf` - FATF требования

### Risk Levels
- `low` - Низкий риск
- `medium` - Средний риск
- `high` - Высокий риск
- `critical` - Критический риск

### Recommendations
- `approve` - Одобрить
- `reject` - Отклонить
- `review` - Требуется проверка
- `request_info` - Запросить дополнительную информацию

---

## Ошибки

API использует стандартные HTTP коды статуса:

- `200` - Успешно
- `400` - Неверный запрос
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

**Пример ответа с ошибкой:**
```json
{
  "detail": "Document not found"
}
```

---

## Аутентификация

В MVP версии аутентификация опциональна. В production версии будет использоваться:
- JWT токены
- API ключи

**Header:**
```
Authorization: Bearer <token>
```

---

## Rate Limiting

В production версии будет реализовано ограничение запросов:
- 1000 запросов/час для аутентифицированных пользователей
- 100 запросов/час для неаутентифицированных

---

## Примеры использования

### Python

```python
import requests

# Загрузка документа
with open('payment.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/documents/upload',
        files={'file': f},
        params={
            'document_type': 'traditional',
            'customer_id': 'customer-uuid'
        }
    )

document_id = response.json()['document_id']

# Анализ документа
response = requests.post(
    f'http://localhost:8000/api/v1/documents/{document_id}/analyze',
    json={'use_rag': True}
)

print(response.json())
```

### cURL

```bash
# Загрузка документа
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -F "file=@payment.pdf" \
  -F "document_type=traditional" \
  -F "customer_id=uuid"

# Compliance проверка
curl -X POST "http://localhost:8000/api/v1/compliance/check" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "uuid",
    "check_types": ["sanctions", "kyc", "aml"]
  }'
```

---

## Swagger UI

Интерактивная документация доступна по адресу:

**http://localhost:8000/api/docs**

Там вы можете протестировать все endpoints прямо в браузере.

---

## Поддержка

Для вопросов и поддержки обращайтесь к документации проекта или создавайте issue в репозитории.
