# Интеграция AI/LLM в проект AMG

## Обзор

Проект AMG теперь включает интеграцию с Ollama для обработки естественного языка и AI-функций. Это позволяет использовать языковые модели для анализа данных, генерации отчетов и поддержки клиентов.

## Архитектура AI-компонента

### Компоненты системы
```
AMG AI Stack:
├── Ollama Server (контейнер)
├── AI Module (Python)
├── Dashboard Integration (Streamlit)
└── Model Management (скрипты)
```

### Технологический стек
- **Ollama**: Локальный сервер для запуска LLM
- **Python**: Модуль интеграции с API
- **Streamlit**: UI для AI-функций
- **Docker**: Контейнеризация всех компонентов

## Установка и настройка

### 1. Быстрый запуск с AI

```bash
# Клонирование и запуск
git clone <repository>
cd AMG
cp config/environments/env.example config/environments/.env
./scripts/setup/start.sh
```

### 2. Управление моделями

```bash
# Запуск менеджера моделей
python scripts/setup/manage_ollama.py

# Или через Docker
docker exec -it abs_ollama ollama pull llama2
```

### 3. Доступные модели

Рекомендуемые модели для банковской системы:
- `llama2` - базовая модель (3.8GB)
- `llama2:7b` - легкая версия
- `codellama` - для анализа кода
- `mistral` - быстрая и эффективная

## Функциональность AI

### 1. Анализ транзакций
- Автоматический анализ подозрительных операций
- Генерация рекомендаций по безопасности
- Классификация типов транзакций

### 2. Генерация отчетов
- Автоматическое создание аналитических отчетов
- Выявление трендов и паттернов
- Прогнозирование финансовых показателей

### 3. Поддержка клиентов
- AI-чат для ответов на вопросы клиентов
- Автоматическая обработка запросов
- Генерация персонализированных рекомендаций

### 4. Анализ безопасности
- Детекция мошеннических операций
- Анализ рисков транзакций
- Рекомендации по безопасности

## API Endpoints

### Ollama API (порт 11434)

```bash
# Проверка статуса
curl http://localhost:11434/api/tags

# Генерация ответа
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "prompt": "Анализируй банковскую транзакцию"
  }'

# Загрузка модели
curl -X POST http://localhost:11434/api/pull \
  -H "Content-Type: application/json" \
  -d '{"name": "llama2"}'
```

## Конфигурация

### Переменные окружения

```bash
# AI настройки
OLLAMA_MODEL=llama2
OLLAMA_HOST=ollama
OLLAMA_PORT=11434
```

### Настройка моделей

```python
# В ai_llm_module.py
class BankingAI:
    def __init__(self):
        self.ollama = OllamaClient(
            host=os.getenv('OLLAMA_HOST', 'localhost'),
            port=int(os.getenv('OLLAMA_PORT', 11434)),
            model=os.getenv('OLLAMA_MODEL', 'llama2')
        )
```

## Мониторинг и логирование

### Проверка статуса AI

```bash
# Проверка доступности Ollama
curl http://localhost:11434/api/tags

# Логи контейнера
docker logs abs_ollama

# Статус всех сервисов
docker-compose ps
```

### Метрики производительности

- Время ответа AI (обычно 2-10 секунд)
- Использование памяти моделей
- Количество запросов к AI
- Качество ответов (через обратную связь)

## Безопасность

### Рекомендации по безопасности

1. **Изоляция сети**: AI-сервис изолирован в Docker
2. **Ограничение доступа**: API доступен только внутри контейнеров
3. **Валидация входных данных**: Все промпты проверяются
4. **Логирование**: Все AI-запросы логируются
5. **Резервное копирование**: Модели сохраняются в volumes

### Настройки безопасности

```yaml
# В docker-compose.yml
ollama:
  environment:
    - OLLAMA_HOST=0.0.0.0
    - OLLAMA_ORIGINS=*
  networks:
    - default
  # Ограничение ресурсов
  deploy:
    resources:
      limits:
        memory: 8G
        cpus: '4.0'
```

## Масштабирование

### Горизонтальное масштабирование

```yaml
# Множественные экземпляры Ollama
ollama:
  deploy:
    replicas: 3
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

### Вертикальное масштабирование

- Увеличение RAM для больших моделей
- Использование GPU для ускорения
- Оптимизация параметров моделей

## Устранение неполадок

### Частые проблемы

1. **Ollama недоступен**
   ```bash
   # Проверка статуса
   docker ps | grep ollama
   docker logs abs_ollama
   ```

2. **Модель не загружается**
   ```bash
   # Принудительная загрузка
   docker exec -it abs_ollama ollama pull llama2
   ```

3. **Медленные ответы**
   - Проверьте ресурсы системы
   - Используйте более легкие модели
   - Настройте кэширование

### Логи и отладка

```bash
# Просмотр логов AI
docker logs -f abs_ollama

# Тестирование API
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama2", "prompt": "test"}'
```

## Разработка и расширение

### Добавление новых AI-функций

1. Создайте новый метод в `BankingAI` классе
2. Добавьте UI в Streamlit dashboard
3. Протестируйте с различными моделями
4. Обновите документацию

### Пример расширения

```python
def analyze_credit_risk(self, client_data: Dict) -> Dict:
    """Анализ кредитного риска клиента"""
    prompt = f"""
    Проанализируй кредитный риск клиента:
    {client_data}
    
    Оцени риск (низкий/средний/высокий) и обоснуй.
    """
    
    response = self.ollama.generate_response(
        prompt=prompt,
        system_prompt=self.system_prompt + " Ты эксперт по кредитным рискам."
    )
    
    return {
        "risk_assessment": response.get('response'),
        "score": self._calculate_risk_score(client_data)
    }
```

## Заключение

Интеграция AI в проект AMG значительно расширяет возможности системы, добавляя интеллектуальный анализ данных, автоматическую генерацию отчетов и улучшенную поддержку клиентов. Система готова к развертыванию в облаке и может быть легко масштабирована под потребности бизнеса.
