# 📊 Аналитика и сбор данных пользователей

## 📋 Обзор

AMG Flow теперь включает мощную систему аналитики, которая собирает и анализирует все взаимодействия пользователей с чатом. Это поможет заказчику понять поведение клиентов и построить эффективные алгоритмы обслуживания.

## 🎯 Что отслеживается

### 👤 **Пользовательские сессии**
- ID сессии и пользователя
- IP-адрес и User-Agent
- Время начала и окончания сессии
- Метаданные (устройство, браузер, локация)

### 💬 **Взаимодействия в чате**
- Все отправленные и полученные сообщения
- Время ответа модели
- Используемые модели
- Ошибки и их типы
- Использование RAG и других функций

### 📈 **Метрики бесед**
- Количество сообщений (пользователь/ассистент)
- Длина сообщений и средние значения
- Время продолжительности беседы
- Использование различных моделей
- Качество взаимодействия

## 🗄️ Структура данных

### **Таблицы аналитики**

| Таблица | Описание | Ключевые поля |
|---------|----------|---------------|
| `user_sessions` | Пользовательские сессии | session_id, user_id, ip_address, started_at |
| `user_interactions` | Отдельные взаимодействия | interaction_type, message_content, response_time_ms |
| `conversation_metrics` | Метрики бесед | total_messages, avg_response_time, models_used |

### **Типы взаимодействий**
- `message_sent` - сообщение отправлено пользователем
- `message_received` - ответ получен от ассистента
- `model_switched` - смена модели
- `rag_enabled/disabled` - использование RAG
- `error_occurred` - произошла ошибка
- `feedback_positive/negative` - обратная связь

## 🚀 Быстрый старт

### 1. Запуск с аналитикой
```bash
# Запустить систему (аналитика включена автоматически)
make dev

# Или с Docker
docker compose up --build
```

### 2. Просмотр аналитики
```bash
# Ежедневная статистика
make analytics-daily

# Активные сессии
make analytics-sessions

# Системные метрики
make analytics-metrics
```

### 3. Экспорт данных
```bash
# Экспорт ежедневного отчета
make export-daily

# Экспорт данных конкретного пользователя
make export-user USER_ID=user123

# Экспорт всех данных за период
make export-comprehensive
```

## 📊 API Endpoints

### **Получение аналитики**
- `GET /v1/analytics/daily` - ежедневная статистика
- `GET /v1/analytics/user/{user_id}` - аналитика пользователя
- `GET /v1/analytics/conversation/{conversation_id}` - аналитика беседы
- `GET /v1/analytics/topics` - анализ тем и паттернов
- `GET /v1/analytics/sessions` - активные сессии
- `GET /v1/analytics/metrics` - системные метрики

### **Экспорт данных**
- `POST /v1/analytics/export/daily` - экспорт ежедневного отчета
- `POST /v1/analytics/export/user/{user_id}` - экспорт данных пользователя
- `POST /v1/analytics/export/conversation/{conversation_id}` - экспорт беседы
- `POST /v1/analytics/export/raw` - экспорт сырых данных
- `POST /v1/analytics/export/comprehensive` - комплексный экспорт

## 📈 Типы отчетов

### 1. **Ежедневная аналитика**
```json
{
  "date": "2025-01-01",
  "sessions": {
    "total": 150,
    "active": 25,
    "completed": 125
  },
  "interactions": {
    "total": 1250,
    "messages": 1000,
    "errors": 5
  },
  "conversations": {
    "total": 200,
    "completed": 180,
    "completion_rate": 0.9
  },
  "models": {
    "usage": [
      {"model": "llama3.2:3b-instruct-q4_0", "count": 800},
      {"model": "codellama:7b-instruct-q4_0", "count": 200}
    ]
  },
  "features": {
    "rag_usage": 120,
    "rag_usage_rate": 0.6
  },
  "performance": {
    "avg_response_time_ms": 1250.5
  }
}
```

### 2. **Аналитика пользователя**
```json
{
  "user_id": "user123",
  "sessions": {
    "total": 15,
    "avg_duration_seconds": 1800.5
  },
  "conversations": {
    "total": 45,
    "avg_length": 8.5
  },
  "messages": {
    "total": 380,
    "user_messages": 190,
    "assistant_messages": 190,
    "avg_user_message_length": 45.2,
    "avg_assistant_message_length": 120.8
  },
  "models": {
    "preferred": [
      {"model": "llama3.2:3b-instruct-q4_0", "usage_count": 300},
      {"model": "codellama:7b-instruct-q4_0", "usage_count": 80}
    ]
  },
  "quality": {
    "error_rate": 0.02,
    "total_errors": 8,
    "feedback_count": 12,
    "positive_feedback_rate": 0.83
  }
}
```

### 3. **Анализ тем и паттернов**
```json
{
  "period_days": 30,
  "total_messages": 5000,
  "top_keywords": [
    {"word": "python", "count": 150},
    {"word": "код", "count": 120},
    {"word": "ошибка", "count": 80}
  ],
  "question_analysis": {
    "total_questions": 800,
    "question_rate": 0.16
  },
  "content_analysis": {
    "avg_message_length": 65.4,
    "total_characters": 327000,
    "unique_words": 2500
  }
}
```

## 📁 Форматы экспорта

### **JSON** - для программной обработки
```bash
./scripts/export_analytics.sh --type daily --format json
```

### **CSV** - для Excel и анализа
```bash
./scripts/export_analytics.sh --type raw --format csv
```

### **XLSX** - комплексные отчеты с листами
```bash
./scripts/export_analytics.sh --type comprehensive --format xlsx
```

## 🔍 Примеры использования

### **Анализ поведения клиентов**
```bash
# Получить данные за последние 7 дней
make analytics-metrics

# Экспортировать данные для анализа
./scripts/export_analytics.sh --type comprehensive --days 7 --format xlsx
```

### **Анализ конкретного пользователя**
```bash
# Аналитика пользователя
make analytics-user USER_ID=client123

# Экспорт данных пользователя
make export-user USER_ID=client123
```

### **Анализ проблемных бесед**
```bash
# Найти беседы с ошибками
curl -s "http://localhost:8000/v1/analytics/conversation/problematic-conversation-id" | jq

# Экспорт проблемной беседы
make export-conversation CONVERSATION_ID=problematic-conversation-id
```

### **Анализ популярных тем**
```bash
# Анализ тем за месяц
make analytics-topics

# Экспорт анализа тем
make export-topics
```

## 📊 Дашборд для заказчика

### **Ключевые метрики**
1. **Активность пользователей**
   - Количество активных сессий
   - Время проведенное в системе
   - Частота использования

2. **Качество обслуживания**
   - Время ответа модели
   - Количество ошибок
   - Обратная связь пользователей

3. **Популярные темы**
   - Часто задаваемые вопросы
   - Проблемные области
   - Интересы клиентов

4. **Эффективность моделей**
   - Использование разных моделей
   - Производительность по моделям
   - Предпочтения пользователей

## 🔒 Приватность и соответствие

### **Сбор данных**
- ✅ **Анонимизация** - IP-адреса хэшируются
- ✅ **Согласие** - данные собираются только при использовании
- ✅ **Контроль** - можно отключить сбор данных
- ✅ **Удаление** - данные можно удалить по запросу

### **Хранение**
- 🔒 **Локальное хранение** - данные не покидают ваш сервер
- 🔒 **Шифрование** - чувствительные данные зашифрованы
- 🔒 **Доступ** - только авторизованные пользователи

### **Экспорт**
- 📤 **Форматированный экспорт** - данные в удобном формате
- 📤 **Фильтрация** - можно экспортировать только нужные данные
- 📤 **Анонимизация** - личные данные можно исключить

## 🛠️ Настройка аналитики

### **Отключение сбора данных**
```python
# В app/config.py
ANALYTICS_ENABLED = False
```

### **Настройка детализации**
```python
# В app/analytics/tracker.py
class AnalyticsTracker:
    def __init__(self, db: Session, detailed_tracking: bool = True):
        self.detailed_tracking = detailed_tracking
```

### **Фильтрация данных**
```python
# Исключить определенные типы взаимодействий
EXCLUDED_INTERACTIONS = ["debug", "test"]
```

## 📈 Рекомендации по использованию

### **Для анализа клиентов**
1. **Регулярно экспортируйте данные** - еженедельно или ежемесячно
2. **Анализируйте паттерны** - ищите общие проблемы и интересы
3. **Отслеживайте качество** - следите за временем ответа и ошибками
4. **Собирайте обратную связь** - используйте метрики удовлетворенности

### **Для улучшения алгоритмов**
1. **Анализируйте популярные вопросы** - создавайте FAQ
2. **Выявляйте проблемные области** - улучшайте обработку ошибок
3. **Оптимизируйте модели** - выбирайте лучшие модели для задач
4. **Персонализируйте опыт** - используйте данные о предпочтениях

## 🆘 Устранение неполадок

### **Аналитика не работает**
```bash
# Проверить статус API
curl http://localhost:8000/v1/health

# Проверить миграции БД
make db-migrate

# Проверить логи
docker compose logs api | grep -i analytics
```

### **Нет данных в отчетах**
```bash
# Проверить активные сессии
make analytics-sessions

# Проверить взаимодействия
curl -s http://localhost:8000/v1/analytics/daily | jq
```

### **Ошибки экспорта**
```bash
# Проверить права доступа
ls -la analytics_exports/

# Проверить место на диске
df -h
```

## 📚 Дополнительные ресурсы

- [API документация](./API.md) - полная документация API
- [Обучение модели](./LEARNING.md) - как обучать модель на данных
- [Развертывание](./DEPLOY.md) - продакшен развертывание

---

**Версия:** 0.1.0  
**Последнее обновление:** 1 января 2025
