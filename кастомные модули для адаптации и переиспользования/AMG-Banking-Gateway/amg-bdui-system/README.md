# AMG Backend-Driven UI System

**Версия:** 1.0  
**Статус:** В разработке  
**Архитектура:** Backend-Driven UI с ролевой системой

## 🎯 Описание

Подключаемая система Backend-Driven UI для банковской платформы AMG. Позволяет динамически генерировать пользовательские интерфейсы на основе ролей пользователей и их прав доступа.

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    AMG BDUI System                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Universal UI Renderer (React)                   │
│  Backend: Go + UI Schema Generator                         │
│  Database: PostgreSQL + Redis (caching)                   │
│  Monitoring: Prometheus + Grafana + Health Checks         │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Быстрый старт

### 1. Запуск системы
```bash
# Запуск всех сервисов
docker-compose up -d

# Или по отдельности
make backend
make frontend
make monitoring
```

### 2. Проверка статуса
```bash
# Проверка здоровья системы
curl http://localhost:8080/health

# Статус UI схем
curl http://localhost:8080/api/ui/status
```

## 📁 Структура проекта

```
amg-bdui-system/
├── backend/                 # Go backend
│   ├── cmd/                # Точки входа
│   ├── internal/           # Внутренняя логика
│   │   ├── ui/            # UI схемы и генераторы
│   │   ├── service/       # Бизнес-логика
│   │   ├── domain/        # Доменные модели
│   │   ├── repository/    # Репозитории
│   │   └── transport/     # HTTP handlers
│   ├── api/               # API спецификации
│   └── configs/           # Конфигурации
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Универсальные компоненты
│   │   ├── renderers/     # Рендереры BDUI
│   │   ├── hooks/         # React hooks
│   │   ├── services/      # API клиенты
│   │   └── utils/         # Утилиты
│   └── public/            # Статические файлы
├── tests/                  # Тесты
│   ├── unit/              # Юнит тесты
│   ├── integration/       # Интеграционные тесты
│   └── e2e/               # E2E тесты
├── monitoring/             # Мониторинг
│   ├── grafana/           # Дашборды Grafana
│   ├── prometheus/        # Конфигурация Prometheus
│   └── alerts/            # Правила алертов
└── docs/                  # Документация
```

## 🎭 Поддерживаемые роли

### Клиентские роли
- **Customer** - Обычный клиент
- **Corporate Customer** - Корпоративный клиент
- **Corporate Admin** - Администратор корпорации

### Банковские роли
- **Teller** - Операционист
- **Credit Officer** - Кредитный специалист
- **Relationship Manager** - Менеджер по работе с клиентами

### Административные роли
- **System Administrator** - Администратор системы
- **Security Administrator** - Администратор безопасности
- **Auditor** - Аудитор

### Управленческие роли
- **Branch Manager** - Руководитель отделения
- **CFO** - Финансовый директор
- **CEO** - Генеральный директор

## 🔧 API Endpoints

### UI Schema API
```
GET  /api/ui/schema/{role}/{page}     # Получение схемы UI
POST /api/ui/validate                 # Валидация UI схемы
GET  /api/ui/status                   # Статус UI сервиса
```

### Health Check API
```
GET  /health                         # Общее здоровье системы
GET  /health/ui                      # Статус UI генератора
GET  /health/database                # Статус базы данных
GET  /health/cache                   # Статус кэша
```

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
make test

# Юнит тесты
make test-unit

# Интеграционные тесты
make test-integration

# E2E тесты
make test-e2e

# Покрытие кода
make test-coverage
```

## 📊 Мониторинг

### Grafana дашборды
- **UI Performance** - Производительность UI
- **Role Usage** - Использование ролей
- **Error Rates** - Частота ошибок
- **System Health** - Здоровье системы

### Prometheus метрики
- `bdui_requests_total` - Общее количество запросов
- `bdui_response_time_seconds` - Время ответа
- `bdui_errors_total` - Количество ошибок
- `bdui_active_schemas` - Активные схемы UI

## 🔐 Безопасность

### Аутентификация
- JWT токены с ролевой информацией
- Refresh токены для долгосрочных сессий
- Rate limiting для API

### Авторизация
- Проверка прав на уровне UI схем
- Фильтрация компонентов по ролям
- Аудит всех UI действий

## 🚀 Развертывание

### Docker
```bash
# Сборка образов
docker-compose build

# Запуск в продакшене
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Применение манифестов
kubectl apply -f k8s/

# Проверка статуса
kubectl get pods -l app=amg-bdui
```

---

**Готово к интеграции в AMG Banking Platform!**
