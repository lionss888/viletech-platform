# Contributing to VILI

Руководство для контрибьюторов проекта VILI Payment Assistant.

## Начало работы

### 1. Fork и клонирование

```bash
# Fork репозитория через GitHub UI
git clone https://github.com/YOUR-USERNAME/vili-project.git
cd vili-project
git remote add upstream https://github.com/original-org/vili-project.git
```

### 2. Настройка окружения

```bash
# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
.\venv\Scripts\activate  # Windows

# Установка зависимостей
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Установка pre-commit hooks
pre-commit install
```

### 3. Запуск для разработки

```bash
# Запуск инфраструктуры
docker-compose up -d postgres redis

# Запуск backend
cd backend
uvicorn app.main:app --reload --port 8000
```

## Git Workflow

### Branching Strategy

```
main          <- production-ready код
  └── develop <- интеграционная ветка
       ├── feature/XXX-description
       ├── bugfix/XXX-description
       └── hotfix/XXX-description
```

### Создание ветки

```bash
# Синхронизация с upstream
git fetch upstream
git checkout develop
git merge upstream/develop

# Создание feature ветки
git checkout -b feature/123-add-new-validator
```

### Commit Messages

Используем формат [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Типы:**
- `feat`: новая функциональность
- `fix`: исправление бага
- `docs`: документация
- `style`: форматирование (не влияет на код)
- `refactor`: рефакторинг
- `test`: добавление тестов
- `chore`: обслуживание, зависимости

**Примеры:**

```bash
git commit -m "feat(compliance): add FATF compliance check"
git commit -m "fix(api): handle empty document body gracefully"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(rag): add integration tests for knowledge search"
```

### Pull Request

1. Убедитесь что все тесты проходят:
   ```bash
   pytest
   ```

2. Проверьте линтинг:
   ```bash
   pre-commit run --all-files
   ```

3. Создайте PR через GitHub с описанием:
   - Что изменено и почему
   - Как тестировать
   - Screenshots (если UI)
   - Связанные issues

## Code Style

### Python

Следуем [PEP 8](https://pep8.org/) с некоторыми расширениями:

- **Line length**: 100 символов
- **Formatter**: Black
- **Import sorting**: isort
- **Type hints**: обязательны для публичных функций

```python
# Хорошо
def process_document(
    document_id: UUID,
    options: ProcessingOptions,
    *,
    validate: bool = True,
) -> ProcessingResult:
    """
    Process a document with given options.
    
    Args:
        document_id: Unique identifier of the document
        options: Processing configuration
        validate: Whether to validate before processing
    
    Returns:
        ProcessingResult with status and extracted data
    
    Raises:
        DocumentNotFoundError: If document doesn't exist
        ValidationError: If validation fails
    """
    ...
```

### Docstrings

Используем Google style:

```python
def function_with_docstring(param1: str, param2: int) -> bool:
    """Short description of function.
    
    Longer description if needed, explaining the purpose
    and any important details.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    
    Raises:
        ValueError: When param2 is negative
    
    Example:
        >>> function_with_docstring("hello", 42)
        True
    """
```

### Naming Conventions

```python
# Classes: PascalCase
class DocumentProcessor:
    pass

# Functions/methods: snake_case
def process_document():
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3

# Private: leading underscore
def _internal_helper():
    pass

# Protected: single underscore in class
class MyClass:
    def _protected_method(self):
        pass
```

## Тестирование

### Требования

- Минимальное покрытие: **70%**
- Все новые функции должны иметь тесты
- Критический код: **90%+** покрытие

### Написание тестов

```python
import pytest
from unittest.mock import MagicMock, AsyncMock

class TestDocumentProcessor:
    """Tests for DocumentProcessor class."""
    
    @pytest.fixture
    def processor(self):
        """Create processor instance for tests."""
        return DocumentProcessor()
    
    @pytest.mark.unit
    def test_detect_format_swift(self, processor):
        """Test SWIFT format detection."""
        # Arrange
        content = b":20:REFERENCE123\n:32A:..."
        
        # Act
        format_type = processor.detect_format(content)
        
        # Assert
        assert format_type == "swift"
    
    @pytest.mark.unit
    def test_detect_format_unknown_raises(self, processor):
        """Test that unknown format raises ValueError."""
        with pytest.raises(ValueError, match="Unknown format"):
            processor.detect_format(b"random content")
    
    @pytest.mark.integration
    async def test_process_with_database(self, processor, db_session):
        """Test processing with real database."""
        # ...
```

### Запуск тестов

```bash
# Все тесты
pytest

# С покрытием
pytest --cov=app --cov-report=html

# Конкретный тест
pytest tests/unit/test_processor.py::TestDocumentProcessor::test_detect_format_swift

# По маркеру
pytest -m unit
pytest -m "not slow"
```

## Структура проекта

```
vili-project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/           # API endpoints
│   │   ├── core/             # Core utilities
│   │   │   ├── config.py     # Configuration
│   │   │   ├── exceptions.py # Custom exceptions
│   │   │   ├── middleware.py # Middleware
│   │   │   └── security.py   # Auth & security
│   │   ├── database/
│   │   │   ├── models/       # SQLAlchemy models
│   │   │   └── schemas/      # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── main.py           # FastAPI app
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── requirements.txt
├── docker-compose.yml
├── docs/
└── README.md
```

## Review Process

### Checklist для автора PR

- [ ] Код соответствует style guide
- [ ] Добавлены/обновлены тесты
- [ ] Все тесты проходят (`pytest`)
- [ ] Pre-commit hooks проходят
- [ ] Обновлена документация (если нужно)
- [ ] Нет секретов в коде
- [ ] Нет TODO без issue

### Checklist для ревьюера

- [ ] Код понятен и читаем
- [ ] Тесты адекватны изменениям
- [ ] Нет security проблем
- [ ] Нет performance проблем
- [ ] Изменения соответствуют описанию PR

## CI/CD

При каждом PR автоматически запускаются:

1. **Linting** (flake8, black, isort, mypy)
2. **Unit Tests** с coverage
3. **Integration Tests**
4. **Security Scan** (bandit, safety)

PR не может быть merged если CI падает.

## Безопасность

### Что НЕ коммитить

- Пароли и секреты
- API ключи
- Приватные сертификаты
- .env файлы с реальными данными

### Reporting Security Issues

Не создавайте публичные issues для security проблем.
Отправьте email на security@your-org.com

## Вопросы и помощь

- **Discussions**: GitHub Discussions для вопросов
- **Issues**: для багов и feature requests
- **Slack**: #vili-dev канал

## License

Участвуя в проекте, вы соглашаетесь что ваш код будет под лицензией проекта.
