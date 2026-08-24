# Техническая спецификация АБС

## Быстрый старт

### Подключение к БД
```bash
# Прямое подключение
psql -h localhost -p 5432 -U lionss -d abs_core

# Через Docker
docker exec -it abs_postgres psql -U lionss -d abs_core
```

### Веб-интерфейс
- **URL:** http://localhost:5050
- **Email:** admin@example.com
- **Пароль:** PgAdmin2024@Secure!Interface#

## Схема данных

### Основные таблицы
```sql
-- Клиенты
clients (id, first_name, last_name, tax_id, created_at)

-- Счета  
accounts (id, account_number, client_id, type, currency, balance, opened_date, is_active)

-- Транзакции
transactions (id, debit_account_id, credit_account_id, amount, currency, description, status, created_at, executed_at)
```

### Представления
```sql
-- Активные счета с данными клиентов
active_accounts_view

-- Детальная информация о транзакциях
transactions_view
```

## API Endpoints (рекомендуемые)

### Клиенты
```
GET    /api/clients              # Список клиентов
GET    /api/clients/{id}         # Клиент по ID
POST   /api/clients              # Создание клиента
PUT    /api/clients/{id}         # Обновление клиента
DELETE /api/clients/{id}         # Удаление клиента (только суперадмин)
```

### Счета
```
GET    /api/accounts             # Список счетов
GET    /api/accounts/{id}        # Счет по ID
GET    /api/clients/{id}/accounts # Счета клиента
POST   /api/accounts             # Создание счета
PUT    /api/accounts/{id}        # Обновление счета
```

### Транзакции
```
GET    /api/transactions         # Список транзакций
GET    /api/transactions/{id}    # Транзакция по ID
POST   /api/transactions         # Создание транзакции
PUT    /api/transactions/{id}    # Обновление статуса
```

## Модели данных

### Client
```json
{
  "id": 1,
  "first_name": "Александр",
  "last_name": "Иванов", 
  "tax_id": "INN0000000001",
  "created_at": "2024-12-01T10:00:00Z"
}
```

### Account
```json
{
  "id": 1,
  "account_number": "ACC00000001",
  "client_id": 1,
  "type": "Расчетный",
  "currency": "RUB",
  "balance": 150000.50,
  "opened_date": "2023-01-15",
  "is_active": true
}
```

### Transaction
```json
{
  "id": 1,
  "debit_account_id": 1,
  "credit_account_id": 2,
  "amount": 10000.00,
  "currency": "RUB",
  "description": "Перевод средств",
  "status": "completed",
  "created_at": "2024-12-01T10:00:00Z",
  "executed_at": "2024-12-01T10:01:00Z"
}
```

## Бизнес-логика

### Создание транзакции
1. Проверка существования счетов
2. Проверка достаточности средств на дебетовом счете
3. Проверка валюты счетов
4. Создание записи транзакции
5. Обновление балансов счетов (при статусе 'completed')

### Валидация
- Баланс счета не может быть отрицательным
- Транзакция не может быть между одинаковыми счетами
- Сумма транзакции должна быть больше 0
- Валюты счетов должны совпадать

## Безопасность

### Аутентификация
- JWT токены для API
- Сессии для веб-интерфейса
- Интеграция с системой ролей БД

### Авторизация
```sql
-- Проверка прав пользователя
SELECT permissions_level FROM security_management.system_users 
WHERE username = 'current_user' AND is_active = true;
```

### Аудит
```sql
-- Логирование операций
INSERT INTO security_management.audit_log 
(operation_type, table_name, user_name, details)
VALUES ('INSERT', 'clients', 'current_user', '{"client_id": 123}');
```

## Производительность

### Индексы
- Все внешние ключи индексированы
- Индексы по часто используемым полям поиска
- Составные индексы для сложных запросов

### Оптимизация запросов
```sql
-- Использование представлений для сложных JOIN
SELECT * FROM active_accounts_view WHERE currency = 'RUB';

-- Партиционирование для больших таблиц
-- transactions по дате создания
```

## Мониторинг

### Ключевые метрики
- Время отклика API
- Количество активных соединений
- Размер таблиц
- Количество транзакций в секунду

### Алерты
- Ошибки подключения к БД
- Превышение лимитов по времени выполнения
- Критические ошибки в транзакциях

## Развертывание

### Docker Compose
```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Пересоздание с новыми данными
docker-compose down -v && docker-compose up -d
```

### Переменные окружения
```env
DB_PASSWORD=Abs2024!Secure#Password$Complex
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=PgAdmin2024@Secure!Interface#
```

## Тестирование

### Unit тесты
- Валидация моделей данных
- Проверка бизнес-логики
- Тестирование API endpoints

### Интеграционные тесты
- Тестирование полного цикла транзакций
- Проверка целостности данных
- Тестирование системы безопасности

### Нагрузочное тестирование
- Симуляция множественных транзакций
- Проверка производительности под нагрузкой
- Тестирование масштабируемости

## Документация API

### Swagger/OpenAPI
```yaml
openapi: 3.0.0
info:
  title: ABS API
  version: 1.0.0
  description: API для автоматизированной банковской системы
```

### Примеры запросов
```bash
# Получение списка клиентов
curl -X GET "http://localhost:8080/api/clients" \
  -H "Authorization: Bearer {token}"

# Создание транзакции
curl -X POST "http://localhost:8080/api/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "debit_account_id": 1,
    "credit_account_id": 2,
    "amount": 1000.00,
    "currency": "RUB",
    "description": "Перевод"
  }'
```

---

**Версия:** 1.0  
**Дата:** 2024-12-01  
**Статус:** Готово к разработке
