# AMG Integration Hub

Универсальная интеграционная шина для подключения внешних систем к AMG Core Platform.

## 🏗️ Архитектура

Проект следует принципам разделения ответственности согласно AMG Core Platform архитектуре:

- **Go Backend** - ядро системы, бизнес-логика, API, управление интеграциями
- **Python Analytics** - аналитика, ML, AI-интеграции, мониторинг производительности
- **Vue Frontend** - Backend-Driven UI для управления интеграциями
- **Integration Hub** - централизованное управление всеми интеграциями

## 📁 Структура проекта

```
AMG-Integration-Bus/
├── go-backend/           # Go backend (ядро системы)
│   ├── cmd/             # Точки входа
│   ├── internal/        # Внутренняя логика
│   │   ├── transport/   # HTTP транспорт
│   │   ├── service/     # Бизнес-логика
│   │   ├── domain/      # Доменные модели
│   │   ├── integration/ # Модули интеграций
│   │   └── data-access/ # Доступ к данным
│   ├── pkg/             # Публичные пакеты
│   └── migrations/      # Миграции БД
├── python-analytics/    # Python аналитика и ML
│   ├── app/            # FastAPI приложение
│   ├── services/       # Аналитические сервисы
│   ├── models/         # ML модели
│   ├── integrations/   # Аналитика интеграций
│   └── utils/          # Утилиты
├── frontend/           # Vue 3 frontend (BDUI)
│   ├── src/           # Исходный код
│   │   ├── components/ # UI компоненты
│   │   ├── views/     # Страницы
│   │   ├── stores/    # Pinia stores
│   │   ├── services/  # API клиент
│   │   └── types/     # TypeScript типы
│   └── public/        # Статические файлы
├── docs/              # Документация
├── scripts/           # Скрипты развертывания
├── monitoring/        # Мониторинг
├── docker/           # Docker конфигурации
├── tests/            # Тесты
└── integrations/     # Шаблоны интеграций
```

## 🚀 Быстрый старт

### 1. Backend (Go)
```bash
cd go-backend
go mod tidy
go run cmd/api/main.go
```

### 2. Analytics (Python)
```bash
cd python-analytics
pip install -r requirements.txt
python -m app.main
```

### 3. Frontend (Vue)
```bash
cd frontend
npm install
npm run dev
```

### 4. Docker (Все сервисы)
```bash
docker-compose up -d
```

## 🔌 Поддерживаемые интеграции

### Банковские системы
- **Striga Banking Platform** - полная интеграция с банковскими API
- **Railsr** - Banking as a Service и Cards as a Service
- **Open Banking APIs** - стандартные банковские протоколы

### Платежные системы
- **Stripe** - обработка платежей
- **PayPal** - платежные операции
- **Crypto** - криптовалютные транзакции

### CRM и маркетинг
- **Salesforce** - управление клиентами
- **HubSpot** - маркетинговая автоматизация
- **Mailchimp** - email маркетинг

### Аналитика и BI
- **Google Analytics** - веб-аналитика
- **Mixpanel** - пользовательская аналитика
- **Tableau** - бизнес-аналитика

## 📊 API Endpoints

### Управление интеграциями
- `GET /api/v1/integrations` - список всех интеграций
- `POST /api/v1/integrations` - создание новой интеграции
- `GET /api/v1/integrations/:id` - детали интеграции
- `PUT /api/v1/integrations/:id` - обновление интеграции
- `DELETE /api/v1/integrations/:id` - удаление интеграции

### Мониторинг
- `GET /api/v1/integrations/:id/status` - статус интеграции
- `GET /api/v1/integrations/:id/metrics` - метрики интеграции
- `GET /api/v1/integrations/:id/logs` - логи интеграции

### Аналитика
- `GET /api/v1/analytics/integrations` - аналитика интеграций
- `GET /api/v1/analytics/performance` - производительность
- `POST /api/v1/analytics/predict` - ML предсказания

## 🔒 Безопасность

- **JWT токены** для внутренней аутентификации
- **OAuth 2.0** для внешних интеграций
- **API ключи** с ротацией
- **Шифрование** всех чувствительных данных
- **Валидация** всех входящих данных
- **Rate limiting** для предотвращения злоупотреблений

## 📈 Мониторинг

- **Health check** endpoints для всех сервисов
- **Prometheus** метрики
- **Grafana** дашборды
- **Алерты** при ошибках интеграций
- **Distributed tracing** для отладки

## 🧪 Тестирование

- **Unit тесты** для всех компонентов
- **Integration тесты** для API
- **E2E тесты** для пользовательских сценариев
- **Load тесты** для производительности

## 📚 Документация

- [Архитектура](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Руководство по интеграции](docs/INTEGRATION_GUIDE.md)
- [Мониторинг](docs/MONITORING.md)
- [Развертывание](docs/DEPLOYMENT.md)

## 🛠️ Разработка

### Требования
- Go 1.21+
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Установка зависимостей
```bash
# Backend
cd go-backend && go mod tidy

# Analytics
cd python-analytics && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Запуск в режиме разработки
```bash
make dev
```

## 📄 Лицензия

Разработано для AMG Core Platform системы. Все права защищены.

## 🤝 Поддержка

Для вопросов и поддержки обращайтесь к команде разработки AMG Core Platform.
