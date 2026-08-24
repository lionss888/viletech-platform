---
name: Расширение интеграции FEA-stage
overview: Создание масштабной и гибкой интеграции с FEA-stage для работы с контрагентами, контрактами, курсами валют и другими сущностями через чат VILI. Архитектура позволит легко добавлять новые сущности в будущем.
todos:
  - id: extend_client_models
    content: "Добавить Pydantic модели: Counterparty, CounterpartyListResponse, Contract, ContractListResponse, CurrencyRate, CurrencyListResponse в fea_stage_client.py"
    status: completed
  - id: extend_client_methods
    content: "Реализовать методы FeaStageClient: get_counterparties, get_counterparty, get_counterparty_requests, get_contracts, get_contract, get_currency_rates с поддержкой фильтрации и пагинации"
    status: completed
  - id: add_intent_types
    content: Добавить IntentType и EntityType для контрагентов, контрактов, курсов валют в intent.py
    status: completed
  - id: add_intent_patterns
    content: Добавить паттерны распознавания для новых intent в IntentDetector, расширить извлечение сущностей
    status: completed
  - id: create_counterparty_handler
    content: Создать CounterpartyHandler с методами handle_list, handle_get, handle_requests
    status: completed
  - id: create_contract_handler
    content: Создать ContractHandler с методами handle_list, handle_get, handle_diadoc_status
    status: completed
  - id: create_currency_handler
    content: Создать CurrencyHandler с методами handle_rates, handle_get_by_symbol
    status: completed
  - id: integrate_handlers
    content: Зарегистрировать новые handlers в chat.py, добавить маршрутизацию в _route_request
    status: completed
  - id: add_error_handling
    content: Добавить обработку ошибок во всех handlers (FeaStageNotConfiguredError, FeaStageConnectionError, FeaStageAuthError)
    status: completed
  - id: write_tests
    content: Написать тесты для новых handlers и интеграции с fea-stage API
    status: completed
  - id: update_documentation
    content: Обновить CHAT_EXTENDED_GUIDE.md и API_DOCUMENTATION.md с примерами новых запросов
    status: completed
---

# Расширение интеграции FEA-stage для VILI

## Цель

Создать масштабную и гибкую интеграцию с FEA-stage API, позволяющую работать с контрагентами, контрактами, курсами валют и другими сущностями через чат VILI. Архитектура должна быть расширяемой для будущих сущностей.

## Архитектура решения

### 1. Расширение FeaStageClient

**Файл:** `backend/app/integrations/fea_stage_client.py`

#### 1.1 Базовые модели данных

Добавить Pydantic модели для новых сущностей:

- `Counterparty` - контрагент с полями: id, name, country, type, banks, accounts, approvalHistory
- `CounterpartyListResponse` - ответ со списком контрагентов (пагинация, фильтры)
- `Contract` - контракт с полями: id, number, type, status, organization, file, diadocStatus
- `ContractListResponse` - ответ со списком контрактов
- `CurrencyRate` - курс валюты с полями: symbol, source, rate, baseCurrency, date
- `CurrencyListResponse` - ответ со списком валют

#### 1.2 Методы клиента

Добавить методы в `FeaStageClient`:

**Контрагенты:**

- `get_counterparties(query_params)` - список с фильтрацией, поиском, пагинацией
- `get_counterparty(id)` - детали контрагента
- `get_counterparty_requests(id, query_params)` - история запросов контрагента
- `create_counterparty(data)` - создание контрагента
- `update_counterparty(id, data)` - обновление
- `delete_counterparty(id)` - удаление

**Контракты:**

- `get_contracts(query_params)` - список с фильтрацией
- `get_contract(id)` - детали контракта
- `create_contract(data)` - создание
- `update_contract(id, data)` - обновление
- `get_contract_diadoc_status(id)` - статус в Diadoc

**Валюты:**

- `get_currencies(query_params)` - список валют
- `get_currency_rates(query_params)` - курсы валют (dashboard-rate endpoint)
- `get_currency_by_symbol(symbol, source)` - курс по символу

#### 1.3 Гибкая система запросов

Реализовать универсальный метод для запросов с поддержкой:

- Фильтрации через query parameters
- Пагинации (page, limit)
- Поиска (search по полям)
- Сортировки (sort, order)
```python
async def _make_request(
    self,
    method: str,
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Универсальный метод для запросов с обработкой ошибок и retry."""
```


#### 1.4 Кэширование (опционально, для будущего)

Добавить базовую структуру для кэширования:

- Декоратор `@cache_result(ttl=300)` для методов чтения
- Инвалидация кэша при изменениях

### 2. Расширение Intent Types

**Файл:** `backend/app/database/schemas/intent.py`

Добавить новые типы намерений:

```python
# Контрагенты
LIST_COUNTERPARTIES = "list_counterparties"
GET_COUNTERPARTY = "get_counterparty"
CREATE_COUNTERPARTY = "create_counterparty"
UPDATE_COUNTERPARTY = "update_counterparty"
GET_COUNTERPARTY_REQUESTS = "get_counterparty_requests"

# Контракты
LIST_CONTRACTS = "list_contracts"
GET_CONTRACT = "get_contract"
CREATE_CONTRACT = "create_contract"
UPDATE_CONTRACT = "update_contract"
GET_CONTRACT_DIADOC_STATUS = "get_contract_diadoc_status"

# Валюты
GET_CURRENCY_RATES = "get_currency_rates"
GET_CURRENCY_BY_SYMBOL = "get_currency_by_symbol"
```

Добавить новые типы сущностей:

```python
COUNTERPARTY_ID = "counterparty_id"
COUNTERPARTY_NAME = "counterparty_name"
CONTRACT_ID = "contract_id"
CONTRACT_NUMBER = "contract_number"
CURRENCY_SYMBOL = "currency_symbol"
CURRENCY_SOURCE = "currency_source"
```

### 3. Паттерны распознавания

**Файл:** `backend/app/services/intent_detector.py`

Добавить паттерны в `_build_patterns()`:

**Контрагенты:**

```python
IntentPattern(
    intent=IntentType.LIST_COUNTERPARTIES,
    keywords=["контрагент", "поставщик", "покупатель", "партнер", "список"],
    required_keywords=["контрагент", "поставщик", "партнер"],
    exclude_keywords=["создай", "создать", "новый", "статус"],
    priority=8
)

IntentPattern(
    intent=IntentType.GET_COUNTERPARTY,
    keywords=["контрагент", "информация", "детали", "данные"],
    required_keywords=["контрагент"],
    exclude_keywords=["список", "все", "создай"],
    priority=9
)
```

**Контракты:**

```python
IntentPattern(
    intent=IntentType.LIST_CONTRACTS,
    keywords=["контракт", "договор", "агентский", "список"],
    required_keywords=["контракт", "договор"],
    exclude_keywords=["создай", "статус"],
    priority=8
)
```

**Валюты:**

```python
IntentPattern(
    intent=IntentType.GET_CURRENCY_RATES,
    keywords=["курс", "валют", "доллар", "евро", "юань", "рубль"],
    required_keywords=["курс"],
    priority=9
)
```

Расширить `_extract_entities()` для извлечения:

- ID контрагента/контракта (UUID, номер)
- Название контрагента
- Символ валюты (USD, EUR, CNY, RUB)

### 4. Chat Handlers

#### 4.1 Counterparty Handler

**Файл:** `backend/app/services/chat_handlers/counterparty_handler.py`

Создать новый handler:

```python
class CounterpartyHandler(BaseHandler):
    async def handle(self, intent_result: IntentResult) -> ChatResponseData:
        intent = intent_result.intent
        
        if intent == IntentType.LIST_COUNTERPARTIES:
            return await self.handle_list(intent_result)
        elif intent == IntentType.GET_COUNTERPARTY:
            return await self.handle_get(intent_result)
        elif intent == IntentType.GET_COUNTERPARTY_REQUESTS:
            return await self.handle_requests(intent_result)
        # ... другие методы
```

Методы:

- `handle_list()` - список контрагентов с фильтрацией
- `handle_get()` - детали контрагента
- `handle_requests()` - история запросов
- `handle_create()` - создание (если нужно)
- `handle_update()` - обновление (если нужно)

#### 4.2 Contract Handler

**Файл:** `backend/app/services/chat_handlers/contract_handler.py`

Аналогичная структура для контрактов:

- `handle_list()` - список контрактов
- `handle_get()` - детали контракта
- `handle_diadoc_status()` - статус в Diadoc

#### 4.3 Currency Handler

**Файл:** `backend/app/services/chat_handlers/currency_handler.py`

Методы:

- `handle_rates()` - курсы валют для дашборда
- `handle_get_by_symbol()` - курс по символу

### 5. Интеграция в Chat API

**Файл:** `backend/app/api/v1/chat.py`

#### 5.1 Регистрация handlers

Добавить импорты и регистрацию новых handlers:

```python
from app.services.chat_handlers import (
    CounterpartyHandler,
    ContractHandler,
    CurrencyHandler,
)
```

#### 5.2 Маршрутизация

Расширить `_route_request()`:

```python
elif intent == IntentType.LIST_COUNTERPARTIES:
    handler = CounterpartyHandler(db)
    return await handler.handle(intent_result)
elif intent == IntentType.GET_COUNTERPARTY:
    handler = CounterpartyHandler(db)
    return await handler.handle(intent_result)
# ... аналогично для контрактов и валют
```

### 6. Форматирование ответов

**Файл:** `backend/app/services/response_formatter.py` (если существует) или в handlers

Реализовать форматирование для:

- Таблиц контрагентов/контрактов
- Карточек детальной информации
- Курсов валют (таблица с символами, курсами, датами)

Использовать markdown для структурированного вывода:

- Таблицы для списков
- Карточки для деталей
- Ссылки на детальные страницы

### 7. Обработка ошибок

Во всех handlers добавить:

- Проверку конфигурации интеграции
- Обработку `FeaStageNotConfiguredError`
- Обработку `FeaStageConnectionError`
- Обработку `FeaStageAuthError`
- Graceful degradation с информативными сообщениями

### 8. Тестирование

**Файл:** `backend/tests/integration/test_fea_stage_integration.py` (создать)

Тесты для:

- Получения списка контрагентов
- Получения деталей контрагента
- Получения списка контрактов
- Получения курсов валют
- Обработки ошибок (не настроена интеграция, недоступен API)

### 9. Документация

Обновить:

- `CHAT_EXTENDED_GUIDE.md` - добавить примеры запросов для новых сущностей
- `API_DOCUMENTATION.md` - описать новые intent types

## Порядок выполнения

1. **Этап 1: Расширение FeaStageClient** (2-3 часа)

   - Добавить модели данных
   - Реализовать методы для контрагентов
   - Реализовать методы для контрактов
   - Реализовать методы для валют
   - Универсальный метод запросов

2. **Этап 2: Intent Types и Patterns** (1-2 часа)

   - Добавить новые IntentType
   - Добавить новые EntityType
   - Добавить паттерны распознавания
   - Расширить извлечение сущностей

3. **Этап 3: Chat Handlers** (3-4 часа)

   - CounterpartyHandler
   - ContractHandler
   - CurrencyHandler
   - Форматирование ответов

4. **Этап 4: Интеграция в Chat API** (1 час)

   - Регистрация handlers
   - Маршрутизация запросов

5. **Этап 5: Тестирование** (2 часа)

   - Unit тесты для handlers
   - Integration тесты для API
   - Тесты обработки ошибок

6. **Этап 6: Документация** (1 час)

   - Обновление гайдов
   - Примеры использования

## Будущие расширения

Архитектура позволяет легко добавлять:

- Organization (организации)
- Payment (платежи)
- Liquidity (ликвидность)
- Другие сущности из fea-stage

Достаточно:

1. Добавить модели в FeaStageClient
2. Добавить методы клиента
3. Добавить IntentType и паттерны
4. Создать Handler
5. Зарегистрировать в маршрутизации

## Критерии готовности

- [ ] Все методы FeaStageClient реализованы и протестированы
- [ ] Все IntentType добавлены и распознаются корректно
- [ ] Все handlers созданы и интегрированы
- [ ] Обработка ошибок работает корректно
- [ ] Тесты написаны и проходят
- [ ] Документация обновлена
- [ ] Примеры запросов работают через чат
