---
name: E1 One-click launch
overview: "Запуск fe-experiment ≤15 мин: start-local, README на 5 ролей, smoke login всех seed-аккаунтов. Строгий критерий программы — оператор поднимает стенд и открывает UI без ручной возни с портами."
todos:
  - id: e1-start-script
    content: Скрипт start-local (compose + health + seed + подсказки dev)
    status: pending
  - id: e1-readme
    content: README — 5 ролей, порты, seed, LIFECYCLE; убрать устаревший scope
    status: pending
  - id: e1-smoke
    content: Smoke — login 5 seed + schema login/list 200
    status: pending
  - id: e1-qa
    content: "QA gate E1: стенд ≤15 мин, UI :5173, role picker"
    status: pending
isProject: false
---

# E1 — One-click запуск

## Зависимость

После зелёных **P0–P7** (BDUI lifecycle в коде). Первый этап программы UI readiness.

## Цель

Новый человек поднимает стенд за ≤15 минут и открывает BDUI UI для 5 ролей ВИ.

## Строгий критерий (вклад в DoD программы)

Оператор без Swagger/curl может: **поднять стенд по инструкции/скрипту** и **залогиниться под каждой из 5 ролей** (часть полного DoD; полный DoD закрывается на E6).

## Scope

- Скрипт [`fe-experiment/start-local.sh`](fe-experiment/start-local.sh): `docker compose up` → проверка Redis/NATS/Mongo → `seed-bdui-lifecycle.js` → подсказка запуска Nest `:30000` и Vite `:5173`
- Обновить [`fe-experiment/README.md`](fe-experiment/README.md): 5 ролей, порты, seed-аккаунты, ссылка на [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md); убрать устаревшее «вне скоупа другие роли»
- Smoke-скрипт: login 5 seed → `GET /bdui/schema/{role}/login` и `forms.list` → 200
- Отметить quality gate E1 в [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md)

## Вне

Прод-деплой, CI E2E Playwright, правки доменного API.

## Опора

- Seed: [`scripts/seed-bdui-lifecycle.js`](fe-experiment/backend-for-ved/scripts/seed-bdui-lifecycle.js)
- Compose: [`backend-for-ved/docker-compose.yml`](fe-experiment/backend-for-ved/docker-compose.yml)
- Чеклист: [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md)

## Проверка стабильности и качества

1. Чистый каталог: compose + seed без ручной правки портов (документированный `.env` из example)
2. Smoke 5 логинов зелёный
3. UI на `:5173`, role picker работает
4. Самопроверка: README совпадает с фактическими ролями BDUI
