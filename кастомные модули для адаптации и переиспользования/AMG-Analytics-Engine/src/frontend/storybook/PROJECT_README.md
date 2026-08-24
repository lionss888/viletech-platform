# Storybook Project - AMG Banking Components

## 📁 Описание

Это изолированный проект Storybook для AMG Banking Analytics System. Содержит библиотеку компонентов в стиле Monexa с современным дизайном.

## 🏗️ Структура проекта

```
storybook-project/
├── package.json                 # Зависимости и скрипты
├── .storybook/                  # Конфигурация Storybook
│   ├── main.js                 # Основная конфигурация
│   └── preview.js              # Глобальные настройки
├── src/
│   ├── styles/
│   │   └── globals.css         # Глобальные стили в стиле Monexa
│   └── components/
│       ├── Button/             # Компонент кнопки
│       ├── Card/               # Компонент карточки
│       ├── Input/              # Компонент поля ввода
│       ├── Navigation/         # Компонент навигации
│       ├── Hero/               # Компонент hero секции
│       ├── Footer/             # Компонент подвала
│       ├── DemoPage/           # Демо-страница
│       └── index.js            # Экспорт всех компонентов
├── Dockerfile                  # Docker конфигурация
├── README.md                   # Оригинальная документация
├── PROJECT_README.md           # Этот файл
├── STORYBOOK_DELIVERY_REPORT.md # Отчет о доставке
└── demo.html                   # Статическая демо-страница
```

## 🚀 Запуск проекта

### Через Docker (рекомендуется)

Проект интегрирован в общий docker-compose.yml основного проекта AMG:

```bash
# Из корневой папки AMG
docker-compose up -d storybook
```

Storybook будет доступен по адресу: http://localhost:6006

### Локальный запуск

```bash
cd storybook-project
npm install
npm run storybook
```

### Сборка статической версии

```bash
npm run build-storybook
```

## 🎨 Компоненты

- **Button** - Кнопки различных стилей и размеров
- **Card** - Карточки для отображения контента
- **Input** - Поля ввода с валидацией
- **Navigation** - Навигационная панель
- **Hero** - Главная секция страницы
- **Footer** - Подвал сайта
- **DemoPage** - Демонстрационная страница

## 🔧 Разработка

### Добавление новых компонентов

1. Создайте папку компонента в `src/components/`
2. Создайте файл компонента (например, `MyComponent.jsx`)
3. Создайте файл историй (например, `MyComponent.stories.jsx`)
4. Экспортируйте компонент в `src/components/index.js`

### Стилизация

Все глобальные стили находятся в `src/styles/globals.css`. Компоненты используют CSS переменные для легкой кастомизации.

## 📋 Связь с основным проектом

Этот Storybook проект является частью AMG Banking Analytics System. Компоненты разработаны для использования в основном dashboard приложении.

## 🤝 Интеграция

Для использования компонентов в основном проекте:

1. Импортируйте необходимые компоненты
2. Применяйте стили из `globals.css`
3. Следуйте дизайн-системе Monexa

## 📄 Документация

- [README.md](README.md) - Оригинальная документация компонентов
- [STORYBOOK_DELIVERY_REPORT.md](STORYBOOK_DELIVERY_REPORT.md) - Отчет о реализации
- [demo.html](demo.html) - Статическая демо всех компонентов
