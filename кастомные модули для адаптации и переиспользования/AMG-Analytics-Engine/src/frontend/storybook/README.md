# AMG Storybook - Компоненты в стиле Monexa

Storybook для проекта AMG с компонентами, вдохновленными дизайном Monexa.

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск Storybook
npm run storybook
```

### Через Docker

```bash
# Запуск всех сервисов включая Storybook
docker-compose up -d

# Только Storybook
docker-compose up storybook
```

Storybook будет доступен по адресу: http://localhost:6006

## 📦 Компоненты

### Button
- **Варианты**: primary, secondary, ghost, danger
- **Размеры**: small, medium, large
- **Особенности**: поддержка иконок, анимации, состояния disabled

### Card
- **Варианты**: elevated, outlined, glass
- **Особенности**: заголовок, подзаголовок, изображение, футер, интерактивность

### Input
- **Варианты**: outlined, filled
- **Размеры**: small, medium, large
- **Особенности**: иконки, валидация, helper text, required поля

### Navigation
- **Особенности**: dropdown меню, мобильная адаптация, фиксированное позиционирование
- **Состояния**: scrolled, mobile menu

### Hero
- **Особенности**: градиентный фон, анимации, статистика, кнопки действий
- **Адаптивность**: мобильная версия

## 🎨 Дизайн система

### Цвета
- **Primary Blue**: #2563eb
- **Secondary Purple**: #7c3aed
- **Accent Green**: #10b981
- **Accent Orange**: #f59e0b
- **Accent Red**: #ef4444

### Типографика
- **Шрифт**: Inter
- **Размеры**: 0.875rem, 1rem, 1.125rem, 1.25rem, 1.5rem, 2rem, 2.5rem, 3.5rem

### Тени
- **Shadow SM**: 0 1px 2px 0 rgb(0 0 0 / 0.05)
- **Shadow MD**: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- **Shadow LG**: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)

### Анимации
- **Transition Fast**: 150ms ease-in-out
- **Transition Normal**: 250ms ease-in-out
- **Transition Slow**: 350ms ease-in-out

## 🔧 Разработка

### Добавление нового компонента

1. Создайте папку в `src/components/`
2. Создайте файл компонента (например, `Component.jsx`)
3. Создайте файл историй (например, `Component.stories.jsx`)
4. Импортируйте в Storybook

### Структура компонента

```jsx
// Component.jsx
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledComponent = styled(motion.div)`
  // стили
`;

const Component = ({ children, ...props }) => {
  return (
    <StyledComponent {...props}>
      {children}
    </StyledComponent>
  );
};

export default Component;
```

### Структура истории

```jsx
// Component.stories.jsx
import React from 'react';
import Component from './Component';

export default {
  title: 'Components/Component',
  component: Component,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    // контролы
  },
};

const Template = (args) => <Component {...args} />;

export const Default = Template.bind({});
Default.args = {
  // пропсы по умолчанию
};
```

## 📱 Адаптивность

Все компоненты адаптированы для мобильных устройств с breakpoint на 768px.

## 🎯 Использование в проекте

Компоненты можно импортировать в основной проект:

```jsx
import Button from './storybook/src/components/Button/Button';
import Card from './storybook/src/components/Card/Card';
import Input from './storybook/src/components/Input/Input';
```

## 🚀 Деплой

Storybook автоматически собирается и запускается в Docker контейнере как часть основного проекта.
