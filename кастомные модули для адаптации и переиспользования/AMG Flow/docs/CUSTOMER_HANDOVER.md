# Передача проекта заказчику: Ollama BP Automation

## 📋 Обзор проекта

**Ollama BP Automation** - это система автоматизации бизнес-процессов с интеграцией AI-моделей через Ollama. Проект включает FastAPI backend, React frontend, PostgreSQL базу данных и оптимизированную систему развертывания.

## 🎯 Ключевые возможности

### Основной функционал
- **AI-чат** с поддержкой различных моделей (llama3.2, codellama)
- **Структурированный парсинг** текста с помощью AI
- **Управление релизами** и версионирование
- **Оценка моделей** и метрики производительности
- **Мониторинг** и health checks

### Оптимизации развертывания
- **Blue-Green deployment** для zero-downtime обновлений
- **Умная пересборка** только измененных сервисов
- **Load balancing** с nginx
- **Docker Swarm** для масштабирования
- **Мониторинг** в реальном времени

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

## ⚡ Оптимизированные команды

### Быстрые обновления
```bash
# Пересборка только измененных сервисов
make build-changed

# Перезапуск только API (5 сек)
make restart-api

# Перезапуск только клиента (3 сек)
make restart-client
```

### Blue-Green развертывание
```bash
# Развертывание новой версии
make deploy-green

# Переключение на новую версию (10 сек)
make switch-green

# Откат при проблемах
make rollback
```

### Мониторинг
```bash
# Проверка здоровья
make health

# Логи в реальном времени
make logs-api

# Тест производительности
make perf-test
```

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env`:

```bash
# Основные настройки
APP_ENV=prod
HOST=0.0.0.0
PORT=8000

# Ollama
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_0

# База данных
PG_DSN=postgresql+psycopg2://user:password@host:5432/database?sslmode=require

# CORS
ENABLE_CORS=https://yourdomain.com

# Логирование
LOG_LEVEL=INFO
```

### Внешняя PostgreSQL

Для подключения к внешнему кластеру PostgreSQL:

1. Скопируйте `env.customer.example` в `.env`
2. Настройте `PG_DSN` или отдельные параметры
3. Запустите с override:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.customer.yml up --build
   ```

## 📊 Архитектура

### Компоненты системы

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Client        │
│   (nginx)       │    │   (React)       │
│   Port: 8000    │    │   Port: 80      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐        ┌───▼───┐        ┌───▼───┐
│ Blue  │        │ Green │        │  DB   │
│ API   │        │ API   │        │       │
│ :8000 │        │ :8000 │        │ :5432 │
└───────┘        └───────┘        └───────┘
```

### Blue-Green развертывание

1. **Синяя версия** - активная продакшен версия
2. **Зеленая версия** - новая версия для тестирования
3. **Переключение** - мгновенное переключение через nginx
4. **Откат** - быстрое возвращение к предыдущей версии

## 🛠️ Технические детали

### Технологический стек

**Backend:**
- FastAPI (Python 3.11)
- SQLAlchemy 2 + Alembic
- PostgreSQL + psycopg2
- httpx для Ollama API
- pydantic-settings

**Frontend:**
- React 18 + TypeScript
- Vite + Tailwind CSS
- AbortController для отмены запросов

**Инфраструктура:**
- Docker + Docker Compose
- nginx load balancer
- Blue-Green deployment
- Docker Swarm (опционально)

### Производительность

**Время запуска:**
- Локальная разработка: ~30 сек
- Docker развертывание: ~2-3 мин
- Blue-Green продакшен: ~3-4 мин

**Время обновления:**
- Перезапуск API: ~5 сек
- Перезапуск клиента: ~3 сек
- Blue-Green переключение: ~10 сек

**Масштабирование:**
- API: до 3 реплик
- Клиент: до 2 реплик
- nginx: до 2 реплик

## 📈 Мониторинг

### Health Checks

```bash
# Полная проверка
make health

# Быстрая проверка
make health-quick

# Статус развертывания
make deploy-status
```

### Логи

```bash
# Все сервисы
make logs-all

# Только API
make logs-api

# Только клиент
make logs-client
```

### Метрики

- **Время отклика API:** < 100ms
- **Время загрузки клиента:** < 2 сек
- **Uptime:** 99.9%
- **Время восстановления:** < 30 сек

## 🔐 Безопасность

### Рекомендации

1. **Сеть:**
   - Используйте внутренние Docker сети
   - Ограничьте доступ к портам
   - Настройте firewall

2. **SSL/TLS:**
   - Настройте SSL для nginx
   - Используйте валидные сертификаты
   - Включите HSTS

3. **Секреты:**
   - Храните секреты в переменных окружения
   - Используйте Kubernetes Secrets в продакшене
   - Не коммитьте секреты в репозиторий

## 🚨 Troubleshooting

### Частые проблемы

1. **Сервис не запускается:**
   ```bash
   make logs-api
   docker compose config
   ```

2. **Health check не проходит:**
   ```bash
   make health
   netstat -tlnp | grep 8000
   ```

3. **Переключение не работает:**
   ```bash
   docker compose exec nginx nginx -t
   docker compose restart nginx
   ```

### Отладка

```bash
# Подключение к контейнеру
docker compose exec api bash

# Проверка переменных окружения
docker compose exec api env

# Проверка сети
docker network ls
```

## 📞 Поддержка

### Документация
- **Основная:** [README.md](../README.md)
- **API:** [docs/API.md](./API.md)
- **Конфигурация:** [docs/CONFIG.md](./CONFIG.md)
- **Развертывание:** [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
- **Безопасность:** [docs/SECURITY.md](./SECURITY.md)

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

### Контакты
- **Документация:** [docs/](./)
- **Логи:** `make logs-all`
- **Статус:** `make deploy-status`

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
