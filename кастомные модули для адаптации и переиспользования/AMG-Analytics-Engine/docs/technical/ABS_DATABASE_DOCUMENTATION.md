# Документация базы данных АБС (Автоматизированная банковская система)

## Обзор системы

Автоматизированная банковская система (АБС) представляет собой полнофункциональное ядро для управления банковскими операциями на основе PostgreSQL. Система обеспечивает безопасное хранение данных клиентов, счетов и транзакций с поддержкой многоуровневой системы прав доступа.

## Архитектура базы данных

### Технологический стек
- **СУБД:** PostgreSQL 15
- **Веб-интерфейс:** pgAdmin 4
- **Контейнеризация:** Docker & Docker Compose
- **Язык:** SQL, PL/pgSQL

### Схема базы данных
```
abs_core (database)
├── public (schema)
│   ├── clients (таблица клиентов)
│   ├── accounts (таблица счетов)
│   ├── transactions (таблица транзакций)
│   ├── active_accounts_view (представление)
│   └── transactions_view (представление)
└── security_management (schema)
    ├── system_users (таблица пользователей системы)
    └── audit_log (журнал аудита)
```

## Детальное описание таблиц

### 1. Таблица `clients` (Клиенты)

**Назначение:** Хранение информации о клиентах банка

**Структура:**
| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | SERIAL | PRIMARY KEY | Уникальный идентификатор клиента |
| `first_name` | VARCHAR(100) | NOT NULL | Имя клиента |
| `last_name` | VARCHAR(100) | NOT NULL | Фамилия клиента |
| `tax_id` | VARCHAR(20) | UNIQUE, NOT NULL | ИНН/налоговый номер |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Дата создания записи |

**Индексы:**
- `idx_clients_tax_id` - оптимизация поиска по ИНН

**Пример данных:**
```sql
SELECT * FROM clients LIMIT 3;
```

### 2. Таблица `accounts` (Счета)

**Назначение:** Хранение информации о банковских счетах

**Структура:**
| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | SERIAL | PRIMARY KEY | Уникальный идентификатор счета |
| `account_number` | VARCHAR(20) | UNIQUE, NOT NULL | Номер счета |
| `client_id` | INTEGER | REFERENCES clients(id) | Ссылка на клиента |
| `type` | VARCHAR(50) | NOT NULL | Тип счета |
| `currency` | VARCHAR(3) | NOT NULL | Валюта счета |
| `balance` | NUMERIC(15,2) | DEFAULT 0, CHECK >= 0 | Баланс счета |
| `opened_date` | DATE | NOT NULL | Дата открытия счета |
| `is_active` | BOOLEAN | DEFAULT true | Статус активности |

**Типы счетов:**
- Расчетный
- Депозитный
- Кредитный
- Сберегательный
- Корпоративный

**Поддерживаемые валюты:**
- RUB (Российский рубль)
- USD (Доллар США)
- EUR (Евро)
- CNY (Китайский юань)

**Индексы:**
- `idx_accounts_client_id` - оптимизация поиска по клиенту
- `idx_accounts_account_number` - оптимизация поиска по номеру счета
- `idx_accounts_is_active` - оптимизация фильтрации активных счетов

### 3. Таблица `transactions` (Транзакции)

**Назначение:** Хранение информации о банковских транзакциях

**Структура:**
| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | BIGSERIAL | PRIMARY KEY | Уникальный идентификатор транзакции |
| `debit_account_id` | INTEGER | REFERENCES accounts(id) | Счет списания |
| `credit_account_id` | INTEGER | REFERENCES accounts(id) | Счет зачисления |
| `amount` | NUMERIC(15,2) | CHECK > 0 | Сумма транзакции |
| `currency` | VARCHAR(3) | NOT NULL | Валюта транзакции |
| `description` | TEXT | | Описание транзакции |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Статус транзакции |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Дата создания |
| `executed_at` | TIMESTAMP | | Дата выполнения |

**Статусы транзакций:**
- `pending` - ожидает выполнения
- `completed` - выполнена
- `failed` - неудачная
- `cancelled` - отменена

**Ограничения:**
- `CHECK (debit_account_id != credit_account_id)` - запрет транзакций между одинаковыми счетами

**Индексы:**
- `idx_transactions_debit_account` - оптимизация поиска по счету списания
- `idx_transactions_credit_account` - оптимизация поиска по счету зачисления
- `idx_transactions_status` - оптимизация фильтрации по статусу
- `idx_transactions_created_at` - оптимизация поиска по дате создания

## Представления (Views)

### 1. `active_accounts_view`

**Назначение:** Представление активных счетов с информацией о клиентах

**Структура:**
```sql
SELECT 
    a.id,
    a.account_number,
    a.type,
    a.currency,
    a.balance,
    a.opened_date,
    c.first_name,
    c.last_name,
    c.tax_id
FROM accounts a
JOIN clients c ON a.client_id = c.id
WHERE a.is_active = true;
```

### 2. `transactions_view`

**Назначение:** Детальная информация о транзакциях с данными счетов и клиентов

**Структура:**
```sql
SELECT 
    t.id,
    t.amount,
    t.currency,
    t.description,
    t.status,
    t.created_at,
    t.executed_at,
    debit.account_number as debit_account,
    credit.account_number as credit_account,
    debit_client.first_name as debit_client_first_name,
    debit_client.last_name as debit_client_last_name,
    credit_client.first_name as credit_client_first_name,
    credit_client.last_name as credit_client_last_name
FROM transactions t
JOIN accounts debit ON t.debit_account_id = debit.id
JOIN accounts credit ON t.credit_account_id = credit.id
JOIN clients debit_client ON debit.client_id = debit_client.id
JOIN clients credit_client ON credit.client_id = credit_client.id;
```

## Система безопасности

### Схема `security_management`

#### Таблица `system_users`
**Назначение:** Управление пользователями системы

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL | Уникальный идентификатор |
| `username` | VARCHAR(50) | Имя пользователя |
| `role_name` | VARCHAR(50) | Роль пользователя |
| `permissions_level` | INTEGER | Уровень прав (1-10) |
| `is_active` | BOOLEAN | Статус активности |
| `created_at` | TIMESTAMP | Дата создания |
| `last_login` | TIMESTAMP | Последний вход |

#### Таблица `audit_log`
**Назначение:** Журнал аудита критических операций

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | Уникальный идентификатор |
| `operation_type` | VARCHAR(50) | Тип операции |
| `table_name` | VARCHAR(50) | Имя таблицы |
| `user_name` | VARCHAR(50) | Пользователь |
| `operation_time` | TIMESTAMP | Время операции |
| `details` | JSONB | Детали операции |

### Роли и права доступа

#### 1. Суперадминистратор (`lionss`)
- **Уровень прав:** 10
- **Возможности:** Полный контроль над системой
- **Права:** CREATE, READ, UPDATE, DELETE на все объекты

#### 2. Администратор (`abs_admin`)
- **Уровень прав:** 6-9
- **Возможности:** Управление данными без удаления
- **Права:** SELECT, INSERT, UPDATE (без DELETE)

#### 3. Оператор (`abs_operator`)
- **Уровень прав:** 3-5
- **Возможности:** Ограниченные операции
- **Права:** SELECT, INSERT на основные таблицы

#### 4. Пользователь только для чтения (`abs_readonly`)
- **Уровень прав:** 1-2
- **Возможности:** Только просмотр данных
- **Права:** SELECT на все таблицы

### Защитные механизмы

1. **Row Level Security (RLS)** - включен на всех основных таблицах
2. **Триггеры защиты** - предотвращение удаления суперадминистратора
3. **Проверка иерархии прав** - автоматическая валидация уровней доступа
4. **Аудит операций** - логирование всех критических действий

## Примеры SQL запросов

### 1. Получение статистики по клиентам
```sql
SELECT 
    COUNT(*) as total_clients,
    COUNT(DISTINCT c.id) as unique_clients
FROM clients c;
```

### 2. Анализ счетов по валютам
```sql
SELECT 
    currency,
    COUNT(*) as accounts_count,
    SUM(balance) as total_balance,
    AVG(balance) as avg_balance
FROM accounts 
WHERE is_active = true
GROUP BY currency
ORDER BY total_balance DESC;
```

### 3. Топ-10 клиентов по балансу
```sql
SELECT 
    c.first_name,
    c.last_name,
    c.tax_id,
    COUNT(a.id) as accounts_count,
    SUM(a.balance) as total_balance
FROM clients c
JOIN accounts a ON c.id = a.client_id
WHERE a.is_active = true
GROUP BY c.id, c.first_name, c.last_name, c.tax_id
ORDER BY total_balance DESC
LIMIT 10;
```

### 4. Статистика транзакций по статусам
```sql
SELECT 
    status,
    COUNT(*) as transactions_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM transactions
GROUP BY status
ORDER BY transactions_count DESC;
```

### 5. Поиск клиента по ИНН
```sql
SELECT 
    c.first_name,
    c.last_name,
    c.tax_id,
    a.account_number,
    a.type,
    a.balance,
    a.currency
FROM clients c
LEFT JOIN accounts a ON c.id = a.client_id
WHERE c.tax_id = 'INN0000000001';
```

## Резервное копирование и восстановление

### Создание резервной копии
```bash
pg_dump -h localhost -p 5432 -U lionss -d abs_core > backup_abs_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из резервной копии
```bash
psql -h localhost -p 5432 -U lionss -d abs_core < backup_abs_20241201_143000.sql
```

## Мониторинг и производительность

### Ключевые метрики для отслеживания:
1. **Количество активных клиентов**
2. **Общий объем средств под управлением**
3. **Количество транзакций в день**
4. **Среднее время выполнения транзакций**
5. **Количество активных счетов**

### Запросы для мониторинга:
```sql
-- Количество активных клиентов
SELECT COUNT(DISTINCT c.id) 
FROM clients c 
JOIN accounts a ON c.id = a.client_id 
WHERE a.is_active = true;

-- Общий объем средств
SELECT 
    currency,
    SUM(balance) as total_balance
FROM accounts 
WHERE is_active = true 
GROUP BY currency;

-- Транзакции за последние 24 часа
SELECT COUNT(*) 
FROM transactions 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
```

## Расширение системы

### Рекомендации по масштабированию:
1. **Партиционирование таблиц** по дате для больших объемов данных
2. **Репликация** для повышения доступности
3. **Кластеризация** для распределения нагрузки
4. **Архивирование** старых транзакций

### Возможные дополнения:
1. **Таблица `cards`** - для банковских карт
2. **Таблица `loans`** - для кредитных продуктов
3. **Таблица `deposits`** - для депозитных продуктов
4. **Таблица `rates`** - для процентных ставок
5. **Таблица `notifications`** - для уведомлений

## Заключение

База данных АБС представляет собой надежную и масштабируемую основу для автоматизированной банковской системы. Архитектура обеспечивает:

- **Безопасность** - многоуровневая система прав доступа
- **Целостность** - строгие ограничения и проверки
- **Производительность** - оптимизированные индексы и представления
- **Масштабируемость** - возможность расширения функциональности
- **Аудит** - полное логирование операций

Система готова к использованию в продакшене и может быть расширена дополнительными модулями в соответствии с потребностями банка.

---

**Версия документации:** 1.0  
**Дата создания:** 2024-12-01  
**Автор:** Система АБС  
**Статус:** Актуальная
