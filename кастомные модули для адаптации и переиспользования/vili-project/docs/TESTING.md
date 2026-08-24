# Тестирование VILI

Руководство по тестированию проекта VILI Payment Assistant.

## Структура тестов

```
backend/tests/
├── __init__.py
├── conftest.py          # Общие фикстуры
├── fixtures/            # Тестовые данные
│   ├── __init__.py
│   ├── sample_documents.json
│   └── sample_knowledge.json
├── unit/                # Unit тесты
│   ├── __init__.py
│   ├── test_llm_service.py
│   ├── test_rag_service.py
│   ├── test_embedding_service.py
│   ├── test_document_processor.py
│   ├── test_text_chunker.py
│   └── test_exceptions.py
├── integration/         # Интеграционные тесты
│   ├── __init__.py
│   ├── test_api_documents.py
│   ├── test_api_compliance.py
│   ├── test_api_risk.py
│   ├── test_api_health.py
│   └── test_api_feedback.py
└── e2e/                 # E2E тесты
    ├── __init__.py
    ├── test_document_workflow.py
    ├── test_compliance_workflow.py
    └── test_risk_workflow.py
```

## Быстрый старт

### Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### Запуск всех тестов

```bash
pytest
```

### Запуск с покрытием

```bash
pytest --cov=app --cov-report=html --cov-report=term-missing
```

## Типы тестов

### Unit тесты

Тестирование отдельных компонентов в изоляции.

```bash
# Запуск только unit тестов
pytest tests/unit/ -v

# Запуск по маркеру
pytest -m unit
```

**Что тестируется:**
- LLM Service - взаимодействие с LiteLLM
- RAG Service - поиск в базе знаний
- Embedding Service - генерация эмбеддингов
- Document Processor - обработка документов
- Validators - валидация данных
- Exceptions - обработка ошибок

### Интеграционные тесты

Тестирование взаимодействия компонентов через API.

```bash
# Запуск только интеграционных тестов
pytest tests/integration/ -v

# Запуск по маркеру
pytest -m integration
```

**Что тестируется:**
- API endpoints
- Работа с базой данных
- Middleware
- Authentication

### E2E тесты

Тестирование полных пользовательских сценариев.

```bash
# Запуск только E2E тестов
pytest tests/e2e/ -v

# Запуск по маркеру
pytest -m e2e
```

**Что тестируется:**
- Полный workflow обработки документов
- Compliance проверки
- Risk оценка
- Интеграция с RAG

## Конфигурация

### pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py
asyncio_mode = auto
addopts = 
    -v
    --strict-markers
    --cov=app
    --cov-report=html
    --cov-fail-under=70
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
```

### Маркеры тестов

- `@pytest.mark.unit` - быстрые unit тесты
- `@pytest.mark.integration` - требуют БД/сервисы
- `@pytest.mark.e2e` - полные workflow
- `@pytest.mark.slow` - медленные тесты

## Фикстуры

### Основные фикстуры (conftest.py)

```python
# База данных (SQLite in-memory для тестов)
@pytest.fixture(scope="function")
def db_session():
    ...

# Синхронный тестовый клиент
@pytest.fixture(scope="function")
def client(db_session):
    ...

# Асинхронный тестовый клиент
@pytest.fixture(scope="function")
async def async_client(db_session):
    ...

# Мок LLM сервиса
@pytest.fixture
def mock_llm_service():
    ...

# Мок Embedding сервиса
@pytest.fixture
def mock_embedding_service():
    ...
```

### Использование фикстур

```python
class TestDocumentAPI:
    @pytest.mark.integration
    def test_upload_document(self, client, db_session):
        response = client.post("/api/v1/documents/upload", ...)
        assert response.status_code == 200
    
    @pytest.mark.integration
    async def test_async_processing(self, async_client):
        response = await async_client.post("/api/v1/documents/process", ...)
        assert response.status_code == 200
```

## Моки и патчинг

### Правильное использование monkeypatch

```python
@pytest.fixture
def service_with_mock(self, monkeypatch):
    """Используйте monkeypatch для корректного патчинга в фикстурах"""
    mock_settings = MagicMock()
    mock_settings.LITELLM_URL = "http://localhost:4000"
    
    # monkeypatch сохраняет мок на всё время теста
    monkeypatch.setattr('app.services.my_service.settings', mock_settings)
    
    return MyService()
```

### Мокирование HTTP запросов

```python
@pytest.fixture
def mock_httpx_client(self):
    """Мок для httpx.AsyncClient"""
    with patch('httpx.AsyncClient') as mock:
        mock_instance = AsyncMock()
        mock.return_value.__aenter__.return_value = mock_instance
        yield mock_instance
```

## Тестовые данные

### fixtures/sample_documents.json

```json
{
  "swift_mt103": {
    "content": "...",
    "type": "swift",
    "format": "mt103"
  }
}
```

### Загрузка фикстур

```python
from tests.fixtures import load_fixture

def test_with_fixture():
    data = load_fixture("sample_documents.json")
    document = data["swift_mt103"]
```

## CI/CD Integration

### GitHub Actions

Тесты автоматически запускаются при:
- Push в main/develop
- Pull Request

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    cd backend
    pytest --cov=app --cov-report=xml
```

### Минимальное покрытие

Требуемое покрытие кода: **70%**

```bash
pytest --cov-fail-under=70
```

## Отладка тестов

### Подробный вывод

```bash
pytest -v --tb=long
```

### Запуск конкретного теста

```bash
pytest tests/unit/test_llm_service.py::TestLLMService::test_complete_success -v
```

### Отладка с pdb

```bash
pytest --pdb
```

### Показать print() выводы

```bash
pytest -s
```

## Best Practices

1. **Изоляция тестов** - каждый тест должен быть независим
2. **Чистые фикстуры** - используйте `scope="function"` для изоляции
3. **Моки внешних сервисов** - не делайте реальных HTTP запросов в unit тестах
4. **Понятные имена** - `test_upload_document_with_invalid_format_returns_400`
5. **AAA паттерн** - Arrange, Act, Assert
6. **Тестируйте edge cases** - пустые данные, ошибки, таймауты

## Troubleshooting

### Event loop is closed

Убедитесь что `asyncio_mode = auto` в pytest.ini и нет ручных event_loop фикстур.

### Fixture scope mismatch

Все зависимые фикстуры должны иметь совместимые scope.

### Mock не работает

Используйте `monkeypatch.setattr()` вместо `patch()` в фикстурах для правильного времени жизни мока.
