# Конфигурация Ollama BP Automation

## 📋 Переменные окружения

### Основные настройки

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `APP_ENV` | Окружение (dev/prod) | `dev` | Нет |
| `HOST` | Хост для API | `0.0.0.0` | Нет |
| `PORT` | Порт для API | `8000` | Нет |
| `LOG_LEVEL` | Уровень логирования | `INFO` | Нет |
| `REQUEST_ID_HEADER` | Заголовок для Request ID | `X-Request-ID` | Нет |

### Ollama настройки

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `OLLAMA_HOST` | URL Ollama сервера | `http://localhost:11434` | Да |
| `OLLAMA_MODEL` | Модель по умолчанию | `llama3.2:3b-instruct-q4_0` | Нет |
| `OLLAMA_TIMEOUT` | Таймаут запросов (сек) | `30` | Нет |
| `OLLAMA_MAX_RETRIES` | Максимум повторов | `3` | Нет |

### База данных

#### Основной способ (PG_DSN)

| Переменная | Описание | Пример | Обязательная |
|------------|----------|--------|--------------|
| `PG_DSN` | Полная строка подключения | `postgresql+psycopg2://user:pass@host:5432/db?sslmode=require` | Да* |

#### Альтернативный способ (отдельные параметры)

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `PGHOST` | Хост PostgreSQL | `localhost` | Нет |
| `PGPORT` | Порт PostgreSQL | `5432` | Нет |
| `PGUSER` | Пользователь | `user` | Нет |
| `PGPASSWORD` | Пароль | `pass` | Нет |
| `PGDATABASE` | Имя базы данных | `appdb` | Нет |
| `PGSSL` | SSL режим | `require` | Нет |

#### Параметры пула соединений

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `DB_POOL_SIZE` | Размер пула соединений | `10` | Нет |
| `DB_POOL_TIMEOUT` | Таймаут пула (сек) | `30` | Нет |
| `DB_POOL_RECYCLE` | Переиспользование соединений (сек) | `3600` | Нет |

### CORS настройки

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `ENABLE_CORS` | Разрешенные origins | `http://localhost:5173` | Нет |
| `CORS_CREDENTIALS` | Разрешить credentials | `true` | Нет |
| `CORS_METHODS` | Разрешенные методы | `GET,POST,PUT,DELETE,OPTIONS` | Нет |

### Эксперименты и канарейка

| Переменная | Описание | Пример | Обязательная |
|------------|----------|--------|--------------|
| `EXPERIMENT_ROLLOUT` | Конфигурация rollout | `myco/ops-logistics:1.1.0-rc1=100` | Нет |
| `DEFAULT_MODEL_TAG` | Тег модели по умолчанию | `myco/ops-logistics:1.0.0` | Нет |

## 🔧 Примеры конфигурации

### Локальная разработка

```bash
# .env
APP_ENV=dev
HOST=0.0.0.0
PORT=8000
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_0
PG_DSN=postgresql+psycopg2://user:pass@localhost:5432/appdb
ENABLE_CORS=http://localhost:5173
LOG_LEVEL=DEBUG
```

### Продакшен с внешней БД

```bash
# .env.customer
APP_ENV=prod
HOST=0.0.0.0
PORT=8000
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_0

# Внешняя PostgreSQL
PG_DSN=postgresql+psycopg2://app_user:STRONG_PASSWORD@postgres-cluster.example.com:5432/production_db?sslmode=require&application_name=ollama-bp-api&connect_timeout=5

# Или отдельные параметры
# PGHOST=postgres-cluster.example.com
# PGPORT=5432
# PGUSER=app_user
# PGPASSWORD=STRONG_PASSWORD
# PGDATABASE=production_db
# PGSSL=require

ENABLE_CORS=https://yourdomain.com
LOG_LEVEL=INFO
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - APP_ENV=dev
      - HOST=0.0.0.0
      - PORT=8000
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_MODEL=llama3.2:3b-instruct-q4_0
      - PG_DSN=postgresql+psycopg2://user:pass@db:5432/appdb
      - ENABLE_CORS=http://localhost:5173
      - LOG_LEVEL=INFO
```

## 🔐 SSL режимы PostgreSQL

### sslmode=require (рекомендуется)
```bash
PG_DSN=postgresql+psycopg2://user:pass@host:5432/db?sslmode=require
```
- Требует SSL соединение
- Не проверяет сертификат сервера
- Подходит для большинства случаев

### sslmode=verify-full (максимальная безопасность)
```bash
PG_DSN=postgresql+psycopg2://user:pass@host:5432/db?sslmode=verify-full&sslcert=/path/to/client.crt&sslkey=/path/to/client.key&sslrootcert=/path/to/ca.crt
```
- Требует SSL соединение
- Проверяет сертификат сервера
- Проверяет имя хоста
- Требует клиентские сертификаты

### sslmode=disable (только для разработки)
```bash
PG_DSN=postgresql+psycopg2://user:pass@host:5432/db?sslmode=disable
```
- Отключает SSL
- Используется только в локальной разработке

## 🌐 CORS конфигурация

### Простая настройка
```bash
ENABLE_CORS=http://localhost:5173
```

### Множественные origins
```bash
ENABLE_CORS=http://localhost:5173,https://app.example.com,https://admin.example.com
```

### Все origins (не рекомендуется для продакшена)
```bash
ENABLE_CORS=*
```

## 🧪 Тестирование конфигурации

### Проверка переменных окружения
```bash
# Показать все переменные
env | grep -E "(APP_|OLLAMA_|PG_|CORS_)"

# Проверить конкретную переменную
echo $PG_DSN
```

### Проверка подключения к БД
```bash
# Тест подключения
make db-smoke

# Или вручную
./scripts/psql_smoke.sh
```

### Проверка Ollama
```bash
# Тест Ollama
curl http://localhost:11434/api/tags

# Через API
curl http://localhost:8000/v1/health/ollama
```

## 🔄 Приоритет конфигурации

1. **Переменные окружения** (высший приоритет)
2. **Файл .env.customer** (если существует)
3. **Файл .env** (если существует)
4. **Значения по умолчанию** (низший приоритет)

## 📝 Примеры для разных сценариев

### Kubernetes
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ollama-bp-config
data:
  APP_ENV: "prod"
  HOST: "0.0.0.0"
  PORT: "8000"
  OLLAMA_HOST: "http://ollama-service:11434"
  OLLAMA_MODEL: "llama3.2:3b-instruct-q4_0"
  ENABLE_CORS: "https://app.example.com"
  LOG_LEVEL: "INFO"
---
apiVersion: v1
kind: Secret
metadata:
  name: ollama-bp-secrets
type: Opaque
data:
  PG_DSN: cG9zdGdyZXNxbCtwc3ljb3BnMjovL3VzZXI6cGFzc0Bwb3N0Z3Jlcy1jbHVzdGVyOjU0MzIvYXBwZGI/c3NsbW9kZT1yZXF1aXJl
```

### Docker Swarm
```yaml
version: '3.8'
services:
  api:
    image: ollama-bp-api:latest
    environment:
      - APP_ENV=prod
      - HOST=0.0.0.0
      - PORT=8000
    secrets:
      - pg_dsn
    configs:
      - ollama_config
```

## ⚠️ Безопасность

### Секреты
- Никогда не коммитьте файлы с паролями
- Используйте Kubernetes Secrets или Docker Secrets
- Ротируйте пароли регулярно

### SSL/TLS
- Всегда используйте SSL в продакшене
- Настройте verify-full для критических систем
- Используйте валидные сертификаты

### CORS
- Ограничьте origins в продакшене
- Не используйте `*` для credentials
- Настройте правильные методы

---

**Последнее обновление:** 1 января 2025  
**Версия:** 1.0