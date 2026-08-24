# 🚀 Быстрый старт AMG Backend-Driven UI System

## ✅ Что создано

**Полная Backend-Driven UI система** с:

### 🏗️ Архитектура
- **Go backend** с API для генерации UI схем
- **React frontend** с универсальным рендерером
- **PostgreSQL + Redis** для данных и кэширования
- **Docker Compose** для простого развертывания

### 🎭 Ролевая система
- **12 ролей** от клиентов до CEO
- **JSON схемы UI** для каждой роли
- **Динамическая фильтрация** по правам доступа
- **Условное отображение** компонентов

### 🧪 Тестирование и мониторинг
- **Health checks** для всех сервисов
- **Prometheus + Grafana** мониторинг
- **Makefile** с удобными командами

## 🚀 Запуск системы

### **1. Быстрый старт (рекомендуется)**
```bash
# Переходим в директорию
cd AMG-Banking-Platform/amg-bdui-system

# Запускаем все сервисы
make up

# Проверяем статус
make health
```

### **2. Разработка**
```bash
# Запуск в режиме разработки
make dev

# Или только Docker сервисы
make up
```

### **3. Тестирование**
```bash
# Все тесты
make test

# Только unit тесты
make test-unit
```

## 🌐 Доступные сервисы

После запуска будут доступны:

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | http://localhost:3000 | React приложение |
| **Backend API** | http://localhost:8080 | Go API сервер |
| **Grafana** | http://localhost:3001 | Мониторинг (admin/admin) |
| **Prometheus** | http://localhost:9090 | Метрики |
| **PostgreSQL** | localhost:5432 | База данных |
| **Redis** | localhost:6379 | Кэш |

## 🔧 API Endpoints

### **UI Schema API**
```bash
# Получить схему UI для роли и страницы
GET /api/ui/schema/{role}/{page}

# Примеры:
curl http://localhost:8080/api/ui/schema/customer/dashboard
curl http://localhost:8080/api/ui/schema/teller/dashboard
curl http://localhost:8080/api/ui/schema/admin/dashboard

# Валидация схемы
POST /api/ui/validate
Content-Type: application/json
{
  "role": "customer",
  "page": "dashboard",
  "title": "Test Dashboard"
}

# Статус UI сервиса
GET /api/ui/status
```

### **Health Check API**
```bash
# Общий статус
curl http://localhost:8080/health

# Статус UI сервиса
curl http://localhost:8080/health/ui

# Статус базы данных
curl http://localhost:8080/health/database

# Статус кэша
curl http://localhost:8080/health/cache
```

## 🎭 Тестирование ролей

### **1. Customer Dashboard**
```bash
curl -H "Authorization: Bearer <customer_token>" \
  http://localhost:8080/api/ui/schema/customer/dashboard
```

**Ожидаемые компоненты:**
- Welcome message
- Balance cards
- Quick actions (переводы, платежи)
- Recent transactions
- Notifications

### **2. Teller Dashboard**
```bash
curl -H "Authorization: Bearer <teller_token>" \
  http://localhost:8080/api/ui/schema/teller/dashboard
```

**Ожидаемые компоненты:**
- Client search
- Quick operations (открыть счет, переводы)
- Pending operations
- Daily stats
- System alerts

### **3. Admin Dashboard**
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:8080/api/ui/schema/admin/dashboard
```

**Ожидаемые компоненты:**
- System metrics
- User management
- Security events
- System configuration

## 📊 Мониторинг

### **Grafana Dashboard**
1. Откройте http://localhost:3001
2. Логин: `admin`, Пароль: `admin`
3. Перейдите в "Dashboards" → "AMG BDUI System Dashboard"

### **Prometheus Metrics**
1. Откройте http://localhost:9090
2. Выберите метрику: `bdui_schema_requests_total`
3. Нажмите "Execute"

### **Health Checks**
```bash
# Проверка всех сервисов
make health

# Логи сервисов
make logs

# Статус контейнеров
make status
```

## 🧪 Тестирование

### **Unit тесты**
```bash
# Backend тесты
cd backend && go test ./... -v

# Frontend тесты
cd frontend && npm test
```

### **Integration тесты**
```bash
# Запуск тестовой среды
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### **E2E тесты**
```bash
# Запуск E2E тестов
cd frontend && npm run test:e2e
```

## 🔧 Разработка

### **Добавление новой роли**
1. Создайте JSON схему в `backend/internal/ui/schemas/`
2. Добавьте роли в `backend/internal/domain/role.go`
3. Обновите тесты в `tests/unit/`

### **Добавление нового компонента**
1. Создайте компонент в `frontend/src/components/`
2. Зарегистрируйте в `ComponentRegistry.tsx`
3. Добавьте тесты

### **Изменение UI схемы**
1. Отредактируйте JSON файл схемы
2. Перезапустите backend: `make restart`
3. Проверьте в браузере

## 🚨 Устранение неполадок

### **Сервисы не запускаются**
```bash
# Проверьте логи
make logs

# Перезапустите сервисы
make restart

# Очистите и пересоздайте
make clean && make up
```

### **База данных недоступна**
```bash
# Проверьте статус PostgreSQL
docker-compose ps postgres

# Проверьте логи
docker-compose logs postgres

# Перезапустите
docker-compose restart postgres
```

### **Frontend не загружается**
```bash
# Проверьте статус
curl http://localhost:3000

# Перезапустите
make restart

# Проверьте логи
make logs-frontend
```

## 📚 Дополнительные команды

```bash
# Остановка всех сервисов
make down

# Очистка данных
make clean

# Форматирование кода
make format

# Линтинг
make lint

# Бэкап базы данных
make backup

# Восстановление из бэкапа
make restore
```

## 🎉 Готово!

Система AMG Backend-Driven UI готова к использованию и интеграции в банковскую платформу!

**Следующие шаги:**
1. Настройте аутентификацию
2. Добавьте больше UI схем
3. Интегрируйте с существующими сервисами
4. Настройте продакшен окружение
