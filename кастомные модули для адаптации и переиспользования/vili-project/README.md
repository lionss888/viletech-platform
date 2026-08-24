# VILI Payment Assistant

**Ваш Интеллектуальный Личный Инспектор** для автоматизации документооборота международных платежей.

## Архитектура

VILI использует гибридную архитектуру LLM:

- **Ollama Cluster** (2 инстанса + Nginx LB) - локальные модели для быстрых задач
- **TGI (FinGPT)** - специализированные финансовые модели локально
- **LiteLLM** - унифицированный API для всех LLM с автоматическим routing
- **Cloud Models** - fallback (GPT-4, Claude) для сложных случаев

## Быстрый старт

### Два варианта запуска

#### 1. 🖥️ Локальный запуск (для разработки)

**Требования:**
- Python 3.11+
- PostgreSQL и Redis (можно в Docker)

```bash
# Автоматический запуск
./start-local.sh

# Или вручную
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
docker compose up -d postgres redis
uvicorn app.main:app --reload
```

**Преимущества:** Быстрая разработка, hot reload, легкая отладка

#### 2. 🐳 Docker запуск (для серверов и облака)

**Требования:**
- Docker и Docker Compose
- 16GB+ RAM (рекомендуется 32GB)
- 50GB+ свободного места на диске

```bash
# Полный запуск всех сервисов
./start-docker.sh

# Или через Makefile
make start

# Или напрямую
docker compose up -d
```

**Преимущества:** Полная изоляция, готово для продакшена, воспроизводимая среда

**Подробнее:** См. [docs/ЗАПУСК_ПРОЕКТА.md](docs/ЗАПУСК_ПРОЕКТА.md)

Первый запуск в Docker займет 10-20 минут (загрузка моделей).

### Проверка статуса

```bash
make status
```

### API Endpoints

- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- LiteLLM: http://localhost:4000
- Ollama: http://localhost:11434
- RabbitMQ Management: http://localhost:15672

## Структура проекта

```
vili-project/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── services/    # Бизнес-логика
│   │   ├── models/      # Data models
│   │   └── db/          # Database
│   ├── init.sql         # Database schema
│   ├── Dockerfile
│   └── requirements.txt
├── nginx-ollama.conf    # Nginx LB для Ollama
├── litellm_config.yaml  # LiteLLM конфигурация
├── docker-compose.yml   # Все сервисы
├── Makefile            # Команды управления
├── start.sh            # Скрипт запуска
└── stop.sh             # Скрипт остановки
```

## Команды управления

```bash
make start          # Запустить всю систему
make stop           # Остановить
make restart        # Перезапустить
make status         # Статус всех сервисов
make logs           # Все логи
make logs-backend   # Логи backend
make logs-ollama    # Логи Ollama cluster
make logs-litellm   # Логи LiteLLM
make logs-tgi       # Логи FinGPT (TGI)
make db-status      # Статус БД
make clean          # Остановить и удалить контейнеры
make help           # Все команды
```

## Модели

### Ollama (локальные)
- llama3.2 - универсальная генерация
- qwen2.5:7b - русский язык и финансы
- qwen2.5:3b - компактная версия
- nomic-embed-text - embedding для RAG
- mistral - креативные задачи
- phi3:mini - быстрая генерация

### FinGPT (через TGI)
- fingpt-sentiment - анализ финансового sentiment
- fingpt-forecaster - прогнозирование

### Cloud (fallback)
- GPT-4 - сложные задачи
- Claude-3 - альтернативный fallback

## API Примеры

### Анализ документа

```bash
curl -X POST http://localhost:8000/api/v1/documents/analyze \
  -F "file=@payment.pdf" \
  -F "document_type=traditional"
```

### Compliance проверка

```bash
curl -X POST http://localhost:8000/api/v1/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-123",
    "check_types": ["sanctions", "kyc", "aml"]
  }'
```

### Оценка рисков

```bash
curl -X POST http://localhost:8000/api/v1/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-123",
    "include_economic_indices": true
  }'
```

## Разработка

### Dev режим

```bash
# Запустить только инфраструктуру
make dev

# Запустить backend вручную
cd backend
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Тесты

```bash
make test           # Запустить тесты
make test-coverage  # Тесты с coverage
```

## Документация

- [ARCHITECTURE.md](ARCHITECTURE.md) - Подробная архитектура
- [REQUIREMENTS.md](REQUIREMENTS.md) - Требования и функциональность
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - План реализации
- [TECHNICAL_SPECS.md](TECHNICAL_SPECS.md) - Технические спецификации
- [INTEGRATION.md](INTEGRATION.md) - Интеграция в приложения

## Troubleshooting

### TGI не запускается
TGI требует GPU. Для работы без GPU:
```yaml
# В docker-compose.yml закомментируйте секцию deploy для tgi-fingpt
# или добавьте --disable-cuda в environment
```

### Медленная загрузка моделей
Первый запуск загружает ~20GB моделей:
- Ollama: ~10GB (llama3.2, qwen2.5, etc.)
- TGI: ~10-15GB (FinGPT)

### Ошибки памяти
Минимум 16GB RAM. Для работы на слабом железе:
```bash
# Используйте только компактные модели
# В litellm_config.yaml оставьте только:
# - local-qwen-small (3GB)
# - local-embedding (275MB)
```

## Лицензия

[Укажите лицензию]

## Контакты

[Укажите контакты]
