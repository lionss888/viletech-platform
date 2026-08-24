---
name: Исправление Unit Тестов
overview: "Исправление 73 падающих тестов в категориях: intent_detector, llm_service, operator_service, text_chunker, а также обработка 429 ошибок в интеграционных тестах."
todos:
  - id: fix-exceptions
    content: Добавить error_code в VILIException или убрать из operator_service
    status: completed
  - id: fix-text-chunker
    content: Исравить _normalize_text чтобы сохранять переносы строк
    status: completed
  - id: fix-llm-mocks
    content: Исправить моки в test_llm_service.py для перехвата Ollama
    status: completed
  - id: fix-intent-detector
    content: Улучшить паттерны intent detector для корректного распознавания
    status: completed
  - id: fix-integration-429
    content: Добавить моки или skip условия для интеграционных тестов
    status: completed
---

# Исправление Unit и Integration Тестов

## Анализ проблем

### 1. Intent Detector (5 тестов)
**Проблема:** Логика паттернов пересекается — например, "Покажи всех операторов" распознаётся как `OPERATOR_ANALYTICS` вместо `OPERATOR_LIST`.

**Причина:** В [intent_detector.py](backend/app/services/intent_detector.py):
- Паттерн `OPERATOR_ANALYTICS` имеет приоритет 10 и `required_keywords=["оператор"]`
- Паттерн `OPERATOR_LIST` имеет приоритет 8 и те же `required_keywords=["оператор"]`
- Слово "Покажи" входит в оба паттерна

**Решение:** Добавить `exclude_keywords` в `OPERATOR_ANALYTICS` для исключения общих запросов списка, либо улучшить логику приоритизации.

---

### 2. LLM Service (5 тестов)
**Проблема:** Моки не перехватывают вызовы к Ollama.

**Причина:** В [llm_service.py](backend/app/services/llm_service.py) строка 18:
```python
self.use_ollama_direct = True  # Временно используем Ollama напрямую
```
Тесты патчат `httpx.AsyncClient`, но метод `_complete_ollama` использует другой путь.

**Решение:** Патчить `LLMService._complete_ollama` или весь метод `complete` вместо низкоуровневого httpx.

---

### 3. Operator Service (2 теста)
**Проблема:** `TypeError: VILIException.__init__() got an unexpected keyword argument 'error_code'`

**Причина:** В [operator_service.py](backend/app/services/operator_service.py) строка 50 вызывается:
```python
error_code="OPERATOR_SERVICE_ERROR"
```
Но [exceptions.py](backend/app/core/exceptions.py) не поддерживает `error_code`.

**Решение:** Добавить `error_code` в `VILIException` или убрать этот параметр из вызова.

---

### 4. Text Chunker (2 теста)
**Проблема:** Нормализация уничтожает переносы строк.

**Причина:** В [text_chunker.py](backend/app/integrations/knowledge/chunkers/text_chunker.py) строка 97:
```python
text = re.sub(r'\s+', ' ', text)  # Заменяет ВСЕ пробельные символы, включая \n
```

**Решение:** Сначала нормализовать переносы строк, потом заменять пробелы:
```python
text = re.sub(r'\n\s*\n', '\n\n', text)  # Сначала нормализуем параграфы
text = re.sub(r'[^\S\n]+', ' ', text)     # Заменяем пробелы кроме \n
```

---

### 5. Integration тесты (429 ошибки, ~50 тестов)
**Проблема:** Rate limiting от внешних сервисов (LiteLLM/Ollama).

**Причина:** Тесты пытаются вызвать реальный LLM сервис без моков.

**Решение варианты:**
- A) Добавить моки LLM сервиса во все интеграционные тесты
- B) Пропускать тесты если LLM недоступен (`pytest.mark.skipif`)
- C) Добавить retry логику с backoff

---

## Рекомендуемый порядок

1. **Быстрые исправления** (operator_service, text_chunker) — 2 изменения
2. **LLM Service тесты** — исправить моки
3. **Intent Detector** — улучшить логику паттернов
4. **Integration тесты** — добавить моки или skip условия

---

## Вопрос

Для интеграционных тестов с 429 ошибками — какой подход предпочтительнее?
- **Мокать LLM** для всех интеграционных тестов (тесты станут быстрее, не зависят от внешних сервисов)
- **Пропускать** если LLM недоступен (сохраняет возможность тестировать с реальным LLM)

## Результаты выполнения

Все задачи выполнены успешно:
- ✅ Operator Service: убраны несуществующие параметры из исключений
- ✅ Text Chunker: исправлена нормализация текста и разбиение длинного текста
- ✅ LLM Service: исправлены моки для перехвата Ollama
- ✅ Intent Detector: улучшены паттерны, исправлена логика приоритизации
- ✅ Integration тесты: добавлены автопатчи LLM сервиса

**Итоговые результаты:**
- Unit тесты: 139 passed
- Integration тесты (test_chat_extended.py): 9 passed
- E2E тесты: 24 passed
