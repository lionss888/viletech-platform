# Custom Dashboard Framework

## Обзор

Кастомный CSS-фреймворк для полного контроля над интерфейсом Streamlit приложения. Позволяет создавать современные, минималистичные интерфейсы в стиле ChatGPT с полной кастомизацией.

## Архитектура

### Файлы фреймворка

- **`custom_dashboard_framework.css`** - Основной CSS файл с переменными и стилями
- **`custom_dashboard_components.py`** - Python компоненты для Streamlit
- **`amg_dashboard.py`** - Основное приложение с использованием фреймворка

### Принципы дизайна

1. **Минимализм** - Чистый, современный дизайн
2. **Консистентность** - Единая система цветов и отступов
3. **Адаптивность** - Работа на всех устройствах
4. **Производительность** - Оптимизированные стили

## Цветовая палитра

```css
:root {
  --primary-bg: #ffffff;        /* Основной фон */
  --secondary-bg: #f7f7f8;      /* Вторичный фон */
  --tertiary-bg: #f1f1f2;       /* Третичный фон */
  --primary-text: #2d3748;      /* Основной текст */
  --secondary-text: #6b7280;    /* Вторичный текст */
  --accent-blue: #10a37f;       /* Акцентный синий */
  --accent-green: #10b981;      /* Акцентный зеленый */
  --accent-red: #ef4444;        /* Акцентный красный */
  --accent-yellow: #f59e0b;     /* Акцентный желтый */
  --border-color: #e5e7eb;      /* Цвет границ */
}
```

## Типографика

```css
:root {
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
}
```

## Система отступов

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}
```

## Компоненты

### Основные контейнеры

```python
# Загрузка CSS
load_custom_css()

# Основной контейнер
custom_dashboard_container()

# Навигация
custom_navigation(brand="AMG Dashboard")

# Основная структура
custom_main_layout()
custom_sidebar()
custom_content_area()

# Закрытие контейнеров
close_custom_layout()
```

### Метрики

```python
# Одиночная метрика
custom_metric_card(
    title="Всего клиентов",
    subtitle="Общее количество клиентов",
    value="1,234",
    label="клиентов",
    icon="👥"
)

# Сетка метрик
metrics_data = [
    {
        'title': 'Всего клиентов',
        'subtitle': 'Общее количество клиентов',
        'value': format_number(1234),
        'label': 'клиентов',
        'icon': '👥'
    }
]
custom_metrics_grid(metrics_data)
```

### Секции

```python
# Создание секции
custom_section("Ключевые метрики", "📊")

# Статус баннер
custom_status_banner("Подключение установлено!", "✅")

# Геро секция
custom_hero_section("AMG Analytics", "Современная аналитическая панель")
```

### Кнопки

```python
# Различные варианты кнопок
custom_button("Сохранить", "primary", "💾")
custom_button("Отмена", "default", "❌")
custom_button("Удалить", "danger", "🗑️")
custom_button("Успех", "success", "✅")
```

### Карточки

```python
# Одиночная карточка
custom_card("Заголовок", "Содержимое карточки", "📄")

# Сетка карточек
cards_data = [
    {
        'title': 'Карточка 1',
        'content': 'Содержимое 1',
        'icon': '📄'
    }
]
custom_cards_grid(cards_data)
```

### Таблицы

```python
# Кастомная таблица
headers = ["ID", "Имя", "Баланс"]
data = [
    ["1", "Иван", "1000 ₽"],
    ["2", "Мария", "2000 ₽"]
]
custom_table(headers, data)
```

## Утилиты форматирования

```python
# Форматирование чисел
format_number(1234567)  # "1 234 567"

# Форматирование валюты
format_currency(1234567)  # "1 234 567 ₽"

# Форматирование процентов
format_percentage(25, 100)  # "25.0%"
```

## Адаптивность

Фреймворк автоматически адаптируется под различные размеры экранов:

- **Desktop** (>768px) - Полная версия с сайдбаром
- **Tablet** (768px) - Адаптивная сетка
- **Mobile** (<768px) - Одноколоночная версия

## Анимации

```css
/* Fade In анимация */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-fade-in {
  animation: fadeIn 0.5s ease-out;
}
```

## Переопределение Streamlit

Фреймворк полностью переопределяет стандартные элементы Streamlit:

```css
/* Скрытие стандартных элементов */
#MainMenu { visibility: hidden; }
footer { visibility: hidden; }
header { visibility: hidden; }
.stApp > header { display: none; }
.stApp > footer { display: none; }
.stApp > div[data-testid="stSidebar"] { display: none; }

/* Переопределение контейнеров */
.main .block-container {
  padding: 0 !important;
  max-width: none !important;
}
```

## Кастомизация

### Изменение цветов

```css
:root {
  --accent-blue: #your-color;
  --primary-bg: #your-bg-color;
}
```

### Добавление новых компонентов

```python
def custom_new_component():
    st.markdown("""
    <div class="custom-new-component">
        <!-- HTML разметка -->
    </div>
    """, unsafe_allow_html=True)
```

### Расширение CSS

```css
.custom-new-component {
  background: var(--primary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}
```

## Преимущества

1. **Полный контроль** - Нет ограничений Streamlit
2. **Современный дизайн** - ChatGPT-стиль
3. **Легкая кастомизация** - CSS переменные
4. **Адаптивность** - Работает везде
5. **Производительность** - Оптимизированный CSS
6. **Масштабируемость** - Легко расширяется

## Тестирование

```bash
# Запуск тестов
python3 test_custom_framework.py
```

Тесты проверяют:
- Существование файлов
- Корректность синтаксиса
- Наличие компонентов
- CSS переменные
- Адаптивность
- Анимации

## Развертывание

1. Скопировать файлы в контейнер
2. Обновить Dockerfile
3. Пересобрать образ
4. Запустить контейнер

```dockerfile
COPY custom_dashboard_components.py .
COPY custom_dashboard_framework.css .
```

## Поддержка

- Совместимость с Streamlit 1.28+
- Поддержка всех современных браузеров
- Адаптация под мобильные устройства
- Оптимизация производительности

