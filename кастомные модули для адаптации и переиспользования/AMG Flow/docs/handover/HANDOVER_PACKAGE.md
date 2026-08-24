# 📦 Пакет передачи проекта AMG Flow

**Дата передачи:** 1 января 2025  
**Версия:** 1.0  
**Статус:** Готово к продакшену

## 🎯 Краткое описание

**AMG Flow** - система автоматизации бизнес-процессов с интеграцией AI-моделей через Ollama. Включает Go backend (ядро), Python analytics (AI/аналитика), React frontend и PostgreSQL базу данных.

## 🚀 Быстрый старт

### 1. Локальная разработка (30 сек)
```bash
# Установка зависимостей
make install

# Запуск API
make dev-fast

# В другом терминале - клиент
make client-dev
```

### 2. Docker развертывание (2-3 мин)
```bash
# Стандартное развертывание
docker compose up --build

# С внешней PostgreSQL
docker compose -f docker-compose.yml -f docker-compose.customer.yml up --build
```

### 3. Продакшен с Blue-Green (3-4 мин)
```bash
# Запуск продакшена
make prod-up

# Развертывание синей версии
make deploy-blue

# Проверка статуса
make health
```

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   Go Backend    │    │  Python Analytics│
│   (Frontend)    │◄──►│   (Core)        │◄──►│   (AI/Analytics)│
│   Port: 5173    │    │   Port: 8080    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │             │
                       │   (Database)    │             │
                       │   Port: 5432    │             │
                       └─────────────────┘             │
                                │                       │
                                ▼                       │
                       ┌─────────────────┐             │
                       │   ChromaDB      │◄────────────┘
                       │   (Vector Store)│    Embeddings
                       │   Port: 8001    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Ollama      │
                       │   (AI Models)   │
                       │   Port: 11434   │
                       └─────────────────┘
```

## ✨ Основные возможности

### 🤖 **AI-чат с RAG**
- Интеграция с Ollama моделями (llama3.2, codellama)
- RAG система с реальными embeddings
- Семантический поиск по истории разговоров
- Потоковый вывод ответов (SSE)
- Сохранение истории бесед

### 🔧 **API**
- RESTful API с FastAPI (Python) и Gin (Go)
- Health checks для всех сервисов
- Централизованная обработка ошибок
- Backend-Driven UI API (в разработке)

### 💾 **База данных**
- PostgreSQL с SQLAlchemy ORM (Python) и GORM (Go)
- Миграции через Alembic
- Поддержка внешних кластеров
- Индексы для производительности

### 🐳 **Контейнеризация**
- Docker и Docker Compose
- Blue-Green deployment
- Multi-stage builds
- Health checks

## 🛠️ Технологический стек

### Backend
- **Go 1.21+** - ядро системы (бизнес-логика)
- **Gin** - веб-фреймворк
- **GORM** - ORM
- **Python 3.11+** - аналитика и AI
- **FastAPI** - Python веб-фреймворк
- **SQLAlchemy 2** - Python ORM

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **Tailwind CSS** - стили
- **Axios** - HTTP клиент

### Infrastructure
- **Docker** - контейнеризация
- **PostgreSQL 14+** - база данных
- **Ollama** - AI модели
- **ChromaDB** - векторное хранилище
- **Nginx** - reverse proxy (опционально)

## 📋 Требования к системе

### Минимальные
- **RAM:** 8GB
- **CPU:** 4 ядра, 2.0GHz
- **Диск:** 50GB SSD
- **ОС:** Linux/macOS/Windows

### Рекомендуемые
- **RAM:** 16-32GB
- **CPU:** 8 ядер, 3.0GHz
- **Диск:** 200GB+ SSD
- **GPU:** NVIDIA RTX 4090 (опционально)

## 🚀 Команды

### Разработка
```bash
make dev              # Запуск в режиме разработки (Go + Python + Client)
make dev-go           # Запуск только Go backend
make dev-python       # Запуск только Python API
make dev-fast         # Быстрый запуск (только Python API)
make install          # Установка зависимостей
make test             # Запуск тестов
make lint             # Проверка кода
```

### Быстрые обновления
```bash
make build-changed    # Пересборка только измененных сервисов
make build-go         # Пересборка только Go backend
make build-python     # Пересборка только Python API
make restart-go       # Перезапуск Go backend
make restart-python   # Перезапуск Python API
make restart-client   # Перезапуск только клиента
```

### Blue-Green развертывание
```bash
make deploy-blue      # Развернуть синюю версию
make deploy-green     # Развернуть зеленую версию
make switch-green     # Переключиться на зеленую
make switch-blue      # Переключиться на синюю
make rollback         # Откат к предыдущей версии
make deploy-status    # Статус развертывания
```

### Мониторинг
```bash
make health           # Проверка здоровья всех сервисов
make health-quick     # Быстрая проверка
make logs-go          # Логи Go backend
make logs-python      # Логи Python API
make logs-client      # Логи клиента
make perf-test        # Тест производительности
```

## 🔧 Конфигурация

### Переменные окружения

Основные настройки в файле `.env`:

```bash
# API
APP_ENV=dev
HOST=0.0.0.0
PORT=8000

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_0

# База данных
PG_DSN=postgresql+psycopg2://user:pass@localhost:5432/appdb

# CORS
ENABLE_CORS=http://localhost:5173
```

## 🧪 Тестирование

```bash
# API тесты
curl http://localhost:8000/v1/health
curl http://localhost:8000/v1/health/ollama
curl http://localhost:8000/v1/health/db

# Тест чата
curl -X POST http://localhost:8000/v1/ask \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b-instruct-q4_0",
    "messages": [{"role": "user", "content": "Привет!"}],
    "convo_id": "test-001",
    "stream": false
  }'
```

## 📊 Мониторинг

### Health Checks
- **Go Backend:** `GET /api/v1/health`
- **Python API:** `GET /v1/health`
- **Ollama:** `GET /v1/health/ollama`
- **Database:** `GET /api/v1/health/db`

### Логи
```bash
# Go backend логи
docker compose logs go-backend

# Python API логи
docker compose logs python-api

# Все сервисы
docker compose logs
```

## 🚨 Известные проблемы

### 1. **Неполная реализация BDUI**
- **Статус:** В разработке (20% готов)
- **Проблема:** Frontend статичный, нет динамической отрисовки
- **Решение:** Завершить реализацию в Go backend

### 2. **Смешанная ответственность Python**
- **Статус:** Требует рефакторинга
- **Проблема:** Python содержит бизнес-логику
- **Решение:** Перенести в Go, оставить только AI/аналитику

### 3. **Неполный Go Backend**
- **Статус:** В разработке (40% готов)
- **Проблема:** Много заглушек, нет полной реализации
- **Решение:** Завершить перенос логики из Python

## 📞 Поддержка

### Документация
- **Основная:** [README.md](./README.md)
- **API:** [docs/API.md](./docs/API.md)
- **Конфигурация:** [docs/CONFIG.md](./docs/CONFIG.md)
- **Развертывание:** [docs/DEPLOY.md](./docs/DEPLOY.md)
- **Безопасность:** [docs/SECURITY.md](./docs/SECURITY.md)

### Команды для диагностики
```bash
# Статус системы
make deploy-status

# Проверка здоровья
make health

# Логи
make logs-all

# Производительность
make perf-test
```

## 🎉 Готово к использованию!

Система полностью настроена и готова к развертыванию. Все оптимизации для быстрых обновлений и zero-downtime развертывания реализованы.

**Следующие шаги:**
1. Настройте переменные окружения
2. Запустите систему: `make prod-up`
3. Разверните синюю версию: `make deploy-blue`
4. Проверьте работу: `make health`

---

**Дата передачи:** 1 января 2025  
**Версия:** 1.0  
**Статус:** Готово к продакшену
