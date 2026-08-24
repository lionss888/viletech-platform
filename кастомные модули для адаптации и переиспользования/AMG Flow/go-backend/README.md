# AMG Flow Go Backend

**Ядро системы AMG Flow - бизнес-логика, валидация и управление состоянием**

## 🏗️ Архитектура

Go backend реализует ядро системы согласно архитектурным принципам:

- **Бизнес-логика**: Вся основная логика приложения
- **Валидация**: Строгая типизация и валидация данных
- **Управление состоянием**: Централизованное управление состоянием
- **API Gateway**: Единая точка входа для клиентов
- **Интеграция**: HTTP/gRPC интеграция с Python сервисами

## 🚀 Быстрый старт

### Локальный запуск

```bash
# 1. Установите зависимости
go mod download

# 2. Настройте переменные окружения
cp env.example .env
# Отредактируйте .env файл

# 3. Запустите сервер
go run cmd/api/main.go
```

### Docker запуск

```bash
# Сборка образа
docker build -t amg-flow-go-backend .

# Запуск контейнера
docker run -p 8080:8080 amg-flow-go-backend
```

## 🌐 API Endpoints

### Health Checks
- `GET /api/v1/health` - Общее состояние сервиса
- `GET /api/v1/health/python` - Состояние Python сервиса
- `GET /api/v1/health/db` - Состояние базы данных

### Chat API
- `POST /api/v1/chat` - Обработка чат-запросов
- `GET /api/v1/chat/history/:conversation_id` - История разговора

### Models API
- `GET /api/v1/models` - Список доступных моделей
- `POST /api/v1/models` - Создание новой модели
- `PUT /api/v1/models/:id` - Обновление модели
- `DELETE /api/v1/models/:id` - Удаление модели

### Analytics API (прокси к Python)
- `GET /api/v1/analytics/daily` - Ежедневная аналитика
- `GET /api/v1/analytics/user/:user_id` - Аналитика пользователя
- `GET /api/v1/analytics/conversation/:conversation_id` - Аналитика разговора

### Backend-Driven UI API
- `GET /api/v1/ui/components` - Список UI компонентов
- `GET /api/v1/ui/forms` - Список UI форм
- `GET /api/v1/ui/tabs` - Список UI вкладок
- `GET /api/v1/ui/schema/:name` - Схема UI по имени

### Workflows API
- `GET /api/v1/workflows` - Список рабочих процессов
- `POST /api/v1/workflows` - Создание рабочего процесса
- `POST /api/v1/workflows/:id/run` - Выполнение рабочего процесса

## 📁 Структура проекта

```
go-backend/
├── cmd/
│   └── api/                 # Точка входа приложения
│       └── main.go
├── internal/
│   ├── domain/              # Доменные модели и интерфейсы
│   │   ├── models.go
│   │   └── repository.go
│   ├── service/             # Бизнес-логика
│   │   ├── chat_service.go
│   │   └── python_client.go
│   └── transport/
│       └── http/            # HTTP транспорт
│           ├── server.go
│           ├── handlers/    # HTTP хендлеры
│           └── middleware/  # HTTP middleware
├── pkg/                     # Общие пакеты
│   ├── config/              # Конфигурация
│   ├── logger/              # Логирование
│   └── errors/              # Обработка ошибок
├── migrations/              # Миграции базы данных
├── scripts/                 # Скрипты
├── docs/                    # Документация
├── go.mod                   # Go модули
├── go.sum                   # Go зависимости
├── Dockerfile               # Docker образ
└── env.example              # Пример переменных окружения
```

## 🔧 Конфигурация

### Переменные окружения

```bash
# Server
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info
ENVIRONMENT=development

# Database
DATABASE_URL=postgres://user:password@localhost:5432/appdb?sslmode=require
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=appdb
DB_SSL_MODE=require

# Python Analytics Service
PYTHON_ANALYTICS_URL=http://localhost:8000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 🧪 Тестирование

```bash
# Запуск тестов
go test ./...

# Запуск тестов с покрытием
go test -cover ./...

# Запуск тестов с подробным выводом
go test -v ./...
```

## 📊 Мониторинг

### Health Checks
- **Go Backend**: `http://localhost:8080/api/v1/health`
- **Python API**: `http://localhost:8000/v1/health`
- **Database**: `http://localhost:8080/api/v1/health/db`

### Логи
```bash
# Логи Go backend
docker compose logs go-backend

# Логи Python API
docker compose logs python-api

# Все логи
docker compose logs
```

## 🔄 Интеграция с Python

Go backend интегрируется с Python сервисом через HTTP API:

1. **Chat запросы** → Python для AI обработки
2. **Analytics данные** → Python для анализа
3. **RAG запросы** → Python для поиска контекста

## 🚀 Развертывание

### Docker Compose
```bash
# Запуск всех сервисов
docker compose up --build

# Запуск только Go backend
docker compose up go-backend
```

### Kubernetes (будущее)
```bash
# Применение манифестов
kubectl apply -f k8s/
```

## 📚 Документация API

Swagger документация доступна по адресу:
- **Development**: `http://localhost:8080/swagger/index.html`
- **Production**: `https://your-domain.com/swagger/index.html`

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку для фичи (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](../../LICENSE) для деталей.
