---
name: Исправление RAG поиска для URL источников
overview: Исправление проблемы, когда URL источники знаний без категории не находятся при поиске с фильтром категории. Добавление поддержки category для URL источников и fallback поиска.
todos:
  - id: "1"
    content: Добавить параметр category в метод add_url_source в knowledge_source_service.py
    status: completed
  - id: "2"
    content: Обновить API endpoint create_knowledge_source для передачи category
    status: completed
    dependencies:
      - "1"
  - id: "3"
    content: Добавить поле category в HTML форму URL в админ-панели
    status: completed
  - id: "4"
    content: Обновить JavaScript для отправки category из формы URL
    status: completed
    dependencies:
      - "3"
  - id: "5"
    content: Добавить fallback поиск в _handle_chat для поиска без категории если с категорией ничего не найдено
    status: completed
  - id: "6"
    content: Улучшить логирование RAG поиска для диагностики
    status: completed
---

# План доработок: Исправление RAG поиска для URL источников

## Проблема

URL источники знаний, добавленные через админ-панель, создаются без категории (`category = NULL`). При поиске с фильтром категории (например, `category="ved"`) такие источники не находятся, так как SQL условие `NULL != "ved"` не выполняется.

## Цель

1. Добавить поддержку категории для URL источников
2. Добавить fallback поиск (если с категорией ничего не найдено, искать без категории)
3. Улучшить логирование для диагностики

## Изменения

### 1. Backend: Добавить параметр category в `add_url_source`

**Файл:** `backend/app/services/knowledge_source_service.py`

- Добавить параметр `category: Optional[str] = None `в метод `add_url_source` (строка 37)
- Обновить docstring с описанием параметра
- Передать `category=category` при создании `KnowledgeSource` (строка 60)

**Обратная совместимость:** Параметр опциональный с default=None, существующий код продолжит работать.

### 2. Backend: Обновить API endpoint для передачи category

**Файл:** `backend/app/api/v1/knowledge_sources.py`

- В методе `create_knowledge_source` (строка 37) передать `category=source.category` в вызов `add_url_source`

**Обратная совместимость:** Если `source.category` не указан, передастся `None`, что соответствует текущему поведению.

### 3. Frontend: Добавить поле category в форму URL

**Файл:** `backend/app/static/admin/index.html`

- Добавить поле для категории в форму URL (после поля description, строка ~102):
  ```html
  <div class="form-group">
      <label for="url-category">Категория (опционально)</label>
      <select id="url-category" name="category">
          <option value="">Без категории</option>
          <option value="ved">ВЭД</option>
          <option value="compliance">Compliance</option>
          <option value="project_management">Управление проектами</option>
      </select>
      <small>Выберите категорию для фильтрации поиска</small>
  </div>
  ```


**Обратная совместимость:** Поле опциональное, можно оставить пустым.

### 4. Frontend: Обновить JavaScript для отправки category

**Файл:** `backend/app/static/admin/js/admin.js`

- В обработчике формы URL (строка ~100) добавить `category: formData.get('category') || null` в объект `data`

**Обратная совместимость:** Если поле не заполнено, отправится `null`, что соответствует текущему поведению.

### 5. Backend: Добавить fallback поиск в `_handle_chat`

**Файл:** `backend/app/api/v1/chat.py`

- В методе `_handle_chat` (после строки 946) добавить fallback логику:
  ```python
  # Если ничего не найдено И была указана категория, ищем без категории
  if not search_results and category_filter:
      try:
          search_results = await rag_service.search_knowledge(
              query=chat_message.message,
              top_k=5 if is_ved_query else 3,
              min_similarity=0.5,
              category=None  # Убираем фильтр категории
          )
          
          if search_results:
              context_parts = []
              for result in search_results:
                  context_parts.append(result['content'])
                  if 'source_name' in result:
                      sources.append(result['source_name'])
              
              context = "\n\n".join(context_parts)
              logger.info(f"RAG fallback search found {len(search_results)} results without category filter")
      except Exception as e:
          logger.warning(f"RAG fallback search failed: {e}")
  ```


**Обратная совместимость:** Fallback срабатывает только если основной поиск не нашел результатов, не влияет на успешные поиски.

### 6. Backend: Улучшить логирование RAG поиска

**Файл:** `backend/app/api/v1/chat.py`

- Добавить логирование перед поиском (строка ~940):
  ```python
  logger.debug(f"RAG search: query='{chat_message.message[:50]}...', category={category_filter}, use_rag={chat_message.use_rag}")
  ```

- Улучшить логирование после поиска (после строки 955):
  ```python
  if search_results:
      logger.info(f"RAG search found {len(search_results)} results with category={category_filter}")
  else:
      logger.info(f"RAG search found 0 results with category={category_filter}")
  ```


**Обратная совместимость:** Только добавление логов, не влияет на функциональность.

## Тестирование

1. Проверить создание URL источника без категории (должно работать как раньше)
2. Проверить создание URL источника с категорией (новая функциональность)
3. Проверить поиск с категорией, когда есть источники с этой категорией
4. Проверить fallback поиск, когда с категорией ничего не найдено, но есть источники без категории
5. Проверить, что существующие файловые источники продолжают работать

## Риски и меры предосторожности

- **Низкий риск:** Все изменения обратно совместимы
- **Параметр category опциональный:** Не сломает существующий код
- **Fallback поиск:** Срабатывает только при отсутствии результатов, не влияет на успешные поиски
- **Логирование:** Только добавление, не изменяет логику

## Порядок выполнения

1. Backend изменения (пункты 1, 2, 5, 6) - можно делать вместе
2. Frontend изменения (пункты 3, 4) - можно делать вместе
3. Тестирование после каждого этапа
