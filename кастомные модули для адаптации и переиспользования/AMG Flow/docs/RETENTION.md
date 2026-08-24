# 🗑️ Data Retention Policy - AMG Flow

## 📋 Обзор

AMG Flow включает автоматическую систему очистки старых данных для управления размером базы данных и соответствия требованиям GDPR.

## 🎯 Что очищается

### 1. **Сообщения чата (messages)**
- **Retention**: 90 дней (по умолчанию)
- **Критерий**: `created_at < cutoff_date`
- **Архивирование**: Да

### 2. **Пользовательские сессии (user_sessions)**
- **Retention**: 30 дней (по умолчанию)
- **Критерий**: `started_at < cutoff_date`
- **Архивирование**: Да

### 3. **Взаимодействия пользователей (user_interactions)**
- **Retention**: 60 дней (по умолчанию)
- **Критерий**: `timestamp < cutoff_date`
- **Архивирование**: Да

### 4. **Метрики бесед (conversation_metrics)**
- **Retention**: 180 дней (по умолчанию)
- **Критерий**: `started_at < cutoff_date`
- **Архивирование**: Да

## ⚙️ Политики retention

### **Development (Разработка)**
```python
messages_retention_days: 180
user_sessions_retention_days: 90
user_interactions_retention_days: 120
conversation_metrics_retention_days: 365
logs_retention_days: 60
dry_run: True  # Безопасный режим
```

### **Production (Продакшен)**
```python
messages_retention_days: 30
user_sessions_retention_days: 7
user_interactions_retention_days: 14
conversation_metrics_retention_days: 90
logs_retention_days: 7
dry_run: False
```

### **Default (По умолчанию)**
```python
messages_retention_days: 90
user_sessions_retention_days: 30
user_interactions_retention_days: 60
conversation_metrics_retention_days: 180
logs_retention_days: 30
dry_run: False
```

## 🚀 Быстрый старт

### Просмотр что будет удалено (dry run)
```bash
# Показать что будет удалено с политикой по умолчанию
bash scripts/cleanup_data.sh --dry-run

# Показать что будет удалено в продакшене
bash scripts/cleanup_data.sh --policy production --dry-run
```

### Очистка данных
```bash
# Очистить с политикой по умолчанию
bash scripts/cleanup_data.sh

# Очистить с политикой разработки
bash scripts/cleanup_data.sh --policy development

# Очистить только таблицу messages
bash scripts/cleanup_data.sh --table messages
```

### Через Makefile
```bash
# Показать что будет удалено
make cleanup-dry-run

# Очистить данные
make cleanup-data

# Очистить с политикой продакшена
make cleanup-production
```

## 🔧 Конфигурация

### Переменные окружения
```bash
# Настройки retention
RETENTION_POLICY=default  # default|development|production
RETENTION_DRY_RUN=false   # true|false
RETENTION_BATCH_SIZE=1000 # Размер батча для удаления
```

### Кастомизация политики
```python
# app/config/retention.py
CUSTOM_RETENTION_POLICY = RetentionPolicy(
    messages_retention_days=60,
    user_sessions_retention_days=14,
    user_interactions_retention_days=30,
    conversation_metrics_retention_days=120,
    batch_size=2000,
    dry_run=False,
    archive_before_delete=True
)
```

## 📊 Мониторинг

### Логи очистки
```bash
# Просмотр логов
tail -f logs/cleanup.log

# Статистика очистки
grep "CLEANUP SUMMARY" logs/cleanup.log
```

### Проверка размера БД
```bash
# Размер таблиц
docker compose exec db psql -U user -d appdb -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 🔒 Безопасность

### Архивирование данных
- Старые данные архивируются перед удалением
- Архивные таблицы: `{table_name}_archive`
- Архив можно восстановить при необходимости

### Dry Run режим
- По умолчанию включен в development
- Показывает что будет удалено без фактического удаления
- Рекомендуется для тестирования

### Батчевое удаление
- Удаление происходит батчами (1000 записей по умолчанию)
- Предотвращает блокировку БД
- Настраивается через `batch_size`

## 📈 Оптимизация

### Индексы для очистки
```sql
-- Индексы для быстрой очистки
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_started_at ON conversation_metrics(started_at);
```

### Партиционирование (для больших таблиц)
```sql
-- Партиционирование по дате
CREATE TABLE messages_y2025m01 PARTITION OF messages
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## 🤖 Автоматизация

### Cron задачи
```bash
# Ежедневная очистка в 3:00
0 3 * * * /path/to/AMG-Flow/scripts/cleanup_data.sh --policy production

# Еженедельная очистка в воскресенье в 2:00
0 2 * * 0 /path/to/AMG-Flow/scripts/cleanup_data.sh --policy development --dry-run
```

### Docker Compose
```yaml
# Добавить в docker-compose.yml
services:
  cleanup:
    image: python:3.11-slim
    volumes:
      - .:/app
    command: python3 scripts/cleanup_old_data.py --policy production
    depends_on:
      - db
    profiles:
      - maintenance
```

## 🆘 Устранение неполадок

### Проблемы с очисткой
```bash
# Проверить подключение к БД
docker compose exec db pg_isready

# Проверить права доступа
docker compose exec db psql -U user -d appdb -c "\dt"

# Проверить логи
tail -f logs/cleanup.log
```

### Восстановление данных
```bash
# Восстановить из архива
docker compose exec db psql -U user -d appdb -c "
INSERT INTO messages 
SELECT * FROM messages_archive 
WHERE created_at >= '2025-01-01';
"
```

### Откат изменений
```bash
# Остановить очистку
pkill -f cleanup_old_data.py

# Проверить состояние БД
docker compose exec db psql -U user -d appdb -c "SELECT COUNT(*) FROM messages;"
```

## 📞 Поддержка

При возникновении проблем с retention policy:
1. Проверьте логи в `logs/cleanup.log`
2. Убедитесь в наличии прав доступа к БД
3. Проверьте конфигурацию политики
4. Используйте dry-run режим для тестирования

---

**Версия документации:** 1.0  
**Последнее обновление:** $(date)  
**Автор:** AMG Flow Team
