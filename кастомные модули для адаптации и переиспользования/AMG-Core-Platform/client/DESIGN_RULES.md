# AMG Core Platform Design System Rules

## 🎨 Цветовая палитра

### Основные цвета
- **Primary Blue**: `#3b82f6` (blue-500) - основные действия, активные состояния
- **Primary Blue Hover**: `#2563eb` (blue-600) - hover состояния
- **Primary Blue Dark**: `#1d4ed8` (blue-700) - pressed состояния

### Семантические цвета
- **Success**: `#10b981` (green-500) - успешные операции, онлайн статусы
- **Error**: `#ef4444` (red-500) - ошибки, стоп-действия
- **Warning**: `#f59e0b` (amber-500) - предупреждения
- **Info**: `#06b6d4` (cyan-500) - информационные сообщения

### Нейтральные цвета
- **Gray 50**: `#f9fafb` - фон панелей
- **Gray 100**: `#f3f4f6` - основной фон приложения
- **Gray 200**: `#e5e7eb` - границы, фон ассистента
- **Gray 300**: `#d1d5db` - неактивные элементы
- **Gray 600**: `#4b5563` - вторичный текст
- **Gray 800**: `#1f2937` - основной текст

## 📏 Spacing Scale

### Внутренние отступы (padding)
- **xs**: `8px` (p-2) - маленькие элементы
- **sm**: `12px` (p-3) - поля ввода, небольшие кнопки
- **md**: `16px` (p-4) - стандартные панели, карточки
- **lg**: `24px` (p-6) - основные контейнеры

### Внешние отступы (margin)
- **xs**: `4px` (space-y-1) - между строками текста
- **sm**: `8px` (space-y-2) - между элементами формы
- **md**: `16px` (space-y-4) - между сообщениями чата
- **lg**: `32px` (space-y-8) - между секциями

## 🔤 Типографика

### Шрифты
- **Primary**: System fonts stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'`
- **Code**: `source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace`

### Размеры текста
- **xs**: `12px` (text-xs) - вспомогательная информация
- **sm**: `14px` (text-sm) - метки, подписи
- **base**: `16px` (text-base) - основной текст
- **lg**: `18px` (text-lg) - заголовки секций
- **xl**: `20px` (text-xl) - заголовки панелей
- **2xl**: `24px` (text-2xl) - главные заголовки

### Веса шрифта
- **normal**: `400` - основной текст
- **medium**: `500` - метки, активные элементы
- **semibold**: `600` - заголовки секций
- **bold**: `700` - главные заголовки

## 🔲 Компоненты

### Кнопки
```css
/* Primary Button */
.btn-primary {
  @apply px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed;
}

/* Secondary Button */
.btn-secondary {
  @apply px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600;
}

/* Danger Button */
.btn-danger {
  @apply px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600;
}
```

### Поля ввода
```css
.input-field {
  @apply w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.textarea-field {
  @apply flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none;
}
```

### Карточки и панели
```css
.card {
  @apply bg-white rounded-lg shadow-lg;
}

.panel {
  @apply p-4 border-b border-gray-200;
}

.panel-header {
  @apply p-4 border-b border-gray-200 bg-gray-50;
}
```

### Статусные индикаторы
```css
.status-online {
  @apply px-3 py-1 rounded-full text-sm bg-green-100 text-green-800;
}

.status-offline {
  @apply px-3 py-1 rounded-full text-sm bg-red-100 text-red-800;
}
```

## 💬 Сообщения чата

### Пользовательские сообщения
```css
.message-user {
  @apply max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-500 text-white;
}
```

### Сообщения ассистента
```css
.message-assistant {
  @apply max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800;
}
```

### Индикатор загрузки
```css
.loading-indicator {
  @apply animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600;
}
```

## 📱 Responsive Design

### Breakpoints
- **sm**: `640px` - мобильные устройства
- **md**: `768px` - планшеты
- **lg**: `1024px` - десктоп
- **xl**: `1280px` - широкие экраны

### Адаптивные правила
- Сообщения: `max-w-xs lg:max-w-md` - ограничение ширины на разных экранах
- Контейнеры: `max-w-4xl mx-auto` - центрирование с ограничением ширины
- Отступы: `p-4 lg:p-6` - увеличение отступов на больших экранах

## 🎯 Naming Convention

### CSS классы
- Используйте семантические названия: `.btn-primary`, `.message-user`
- Состояния через модификаторы: `.btn-primary:hover`, `.btn-primary:disabled`
- Размеры через суффиксы: `.btn-sm`, `.btn-lg`

### Компоненты
- PascalCase для React компонентов: `ChatMessage`, `StatusIndicator`
- camelCase для пропсов: `isLoading`, `messageType`
- kebab-case для CSS классов: `.chat-message`, `.status-indicator`

## ⚡ Анимации

### Transitions
- **Fast**: `150ms` - hover эффекты кнопок
- **Normal**: `300ms` - появление/скрытие элементов
- **Slow**: `500ms` - сложные анимации

### Easing
- **ease-in-out** для большинства переходов
- **ease-out** для появления элементов
- **ease-in** для исчезновения элементов
