# AMG BDUI System API Documentation

## Обзор

AMG Backend-Driven UI System предоставляет RESTful API для динамической генерации пользовательских интерфейсов на основе ролей пользователей.

## Базовый URL

```
http://localhost:8080/api
```

## Аутентификация

API использует JWT токены для аутентификации. Добавьте заголовок:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Health Check

#### GET /health
Проверка общего состояния системы.

**Ответ:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "ui_service": {
      "status": "healthy",
      "response_time": "10ms"
    }
  },
  "version": "1.0.0",
  "uptime": "1h30m"
}
```

#### GET /health/ui
Проверка состояния UI сервиса.

**Ответ:**
```json
{
  "status": "healthy",
  "response_time": "5ms",
  "details": {
    "total_schemas": 12,
    "active_schemas": 10,
    "roles_count": 12,
    "last_updated": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /health/database
Проверка состояния базы данных.

**Ответ:**
```json
{
  "status": "healthy",
  "response_time": "15ms",
  "details": {
    "version": "PostgreSQL 15.0"
  }
}
```

#### GET /health/cache
Проверка состояния кэша Redis.

**Ответ:**
```json
{
  "status": "healthy",
  "response_time": "2ms",
  "details": {
    "redis_info": "Redis 7.0"
  }
}
```

### UI Schema API

#### GET /api/ui/schema/{role}/{page}
Получение UI схемы для указанной роли и страницы.

**Параметры:**
- `role` (string) - Роль пользователя (customer, teller, admin, etc.)
- `page` (string) - Страница (dashboard, accounts, transactions, etc.)

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "customer_dashboard",
    "role": "customer",
    "page": "dashboard",
    "title": "Главная",
    "description": "Главная страница клиента",
    "layout": {
      "type": "grid",
      "columns": 12,
      "gap": "16px"
    },
    "components": [
      {
        "id": "welcome_message",
        "type": "text",
        "name": "welcome_message",
        "title": "Добро пожаловать!",
        "permissions": ["read_profile"],
        "is_visible": true
      }
    ],
    "permissions": ["read_profile"],
    "is_active": true
  },
  "meta": {
    "role": "customer",
    "page": "dashboard",
    "permissions": ["read_profile"],
    "version": 1
  }
}
```

#### POST /api/ui/validate
Валидация UI схемы.

**Тело запроса:**
```json
{
  "role": "customer",
  "page": "dashboard",
  "title": "Test Dashboard",
  "components": [
    {
      "id": "test_component",
      "type": "text",
      "name": "test_text",
      "title": "Test Text"
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Schema is valid"
}
```

#### GET /api/ui/status
Получение статуса UI сервиса.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "total_schemas": 12,
    "active_schemas": 10,
    "roles_count": 12,
    "last_updated": "2024-01-01T00:00:00Z",
    "cache_status": "healthy",
    "database_status": "healthy"
  }
}
```

#### GET /api/ui/roles
Получение списка доступных ролей.

**Ответ:**
```json
{
  "success": true,
  "data": [
    "customer",
    "corporate_customer",
    "corporate_admin",
    "teller",
    "credit_officer",
    "relationship_manager",
    "system_administrator",
    "security_administrator",
    "auditor",
    "branch_manager",
    "cfo",
    "ceo"
  ]
}
```

### Authentication API

#### POST /api/auth/login
Аутентификация пользователя.

**Тело запроса:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "user@example.com",
      "role": "customer",
      "permissions": ["read_profile", "read_own_accounts"]
    }
  }
}
```

#### POST /api/auth/refresh
Обновление токена доступа.

**Тело запроса:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

#### POST /api/auth/logout
Выход из системы.

**Заголовки:**
```
Authorization: Bearer <access_token>
```

**Ответ:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### Protected Routes

#### GET /api/profile
Получение профиля пользователя.

**Заголовки:**
```
Authorization: Bearer <access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer",
    "permissions": ["read_profile", "read_own_accounts"],
    "last_login": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/profile
Обновление профиля пользователя.

**Заголовки:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "user@example.com",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## Коды ошибок

### HTTP Status Codes

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `422` - Ошибка валидации
- `500` - Внутренняя ошибка сервера
- `503` - Сервис недоступен

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Примеры использования

### Получение UI схемы для клиента

```bash
curl -X GET \
  "http://localhost:8080/api/ui/schema/customer/dashboard" \
  -H "Authorization: Bearer your_jwt_token"
```

### Валидация UI схемы

```bash
curl -X POST \
  "http://localhost:8080/api/ui/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "customer",
    "page": "dashboard",
    "title": "Test Dashboard",
    "components": [
      {
        "id": "test_component",
        "type": "text",
        "name": "test_text",
        "title": "Test Text"
      }
    ]
  }'
```

### Аутентификация

```bash
curl -X POST \
  "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123"
  }'
```

## Rate Limiting

API имеет ограничения на количество запросов:

- **UI Schema API**: 100 запросов в минуту
- **Authentication API**: 10 запросов в минуту
- **Health Check API**: 1000 запросов в минуту

При превышении лимита возвращается HTTP 429.

## Версионирование

API использует версионирование через URL:

- `v1` - Текущая версия (по умолчанию)
- `v2` - Будущая версия

Пример: `http://localhost:8080/api/v1/ui/schema/customer/dashboard`
