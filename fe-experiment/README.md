# FE experiment — BDUI (роль User)

Рабочая копия backend (`backend-for-ved` = fea-stage-vf2) + тонкий BDUI-слой + Vite/React-рендерер.

## Структура

```
fe-experiment/
  backend-for-ved/   # Nest API + модуль src/modules/bdui (+ scripts/create-bdui-user.js)
  bdui-client/       # Vite + React schema renderer
  NOTES.md           # метрики эксперимента
```

## Критерии успеха

1. Логин User → JWT → схема с бэка
2. Список заявок (`GET /api/1.0/form-payment`)
3. Создание заявки (`POST /api/1.0/form-payment`)
4. Карточка: статус + CTA accept/cancel по статусу
5. Unit-тесты builders/resolver в `backend-for-ved/src/modules/bdui/**/*.spec.ts`

## Запуск

### 1. Инфра

```bash
cd fe-experiment/backend-for-ved
docker compose up -d
cp .env.example .env
```

В `.env` выставьте (compose Redis на **6380**):

```
REDIS_URL=redis://127.0.0.1:6380
REDIS_QUEUE_PORT=6380
```

NATS на `4222` обязателен для JWT.

### 2. Backend

```bash
cd fe-experiment/backend-for-ved
npm i
npm run dev
# http://localhost:30000
# Swagger: http://localhost:30000/api/1.0/fea360/swagger
# BDUI: GET /api/1.0/bdui/schema/user/login
```

Тесты BDUI:

```bash
npm test -- --testPathPattern=modules/bdui --no-coverage
```

### 3. Тестовый User

```bash
cd fe-experiment/backend-for-ved
node scripts/create-bdui-user.js
# default: user@bdui.local / BduiUser2024!
```

### 4. Клиент

```bash
cd fe-experiment/bdui-client
npm i
npm run dev
# http://localhost:5173  (proxy /api → :30000)
```

Сценарий: `/login` → `/forms` → `/forms/new` → `/forms/:id`.

## BDUI контракт

| page | auth | назначение |
|------|------|------------|
| `login` | нет | форма входа |
| `forms.list` | JWT | таблица заявок |
| `forms.create` | JWT | упрощённое создание |
| `forms.detail?status=` | JWT | карточка + action_bar |

Эндпоинты: `GET /api/1.0/bdui/schema/user/:page`

## Вне скоупа

Другие роли ВИ, полный wizard, Diadoc/hs-code, копирование AMG BDUI, правки исходного `кастомные модули…/backend-for-ved`.
