# FE experiment — BDUI (5 ролей ВИ)

Рабочая копия backend (`backend-for-ved`) + тонкий BDUI-слой + Vite/React-рендерер.

Образ результата: запуск стенда → заявка по lifecycle в UI → ручной тест User / ICO / ECO / Manager / Provider.

## Структура

```
fe-experiment/
  start-local.sh     # compose + .env + seed
  backend-for-ved/   # Nest API + src/modules/bdui
  bdui-client/       # Vite + React schema renderer
  LIFECYCLE.md       # чеклисты P0–P7 и E1–E9
  NOTES.md           # gaps / StageHash / MinIO / seed dirs
```

## Быстрый старт (≤15 мин)

```bash
cd fe-experiment
chmod +x start-local.sh
./start-local.sh
```

Скрипт поднимает Mongo/Redis/NATS/**MinIO** (compose), правит `.env` под порты compose (Redis **6380**, S3 **9000**), сидит 5 ролей.

Два терминала:

```bash
# A — API
cd fe-experiment/backend-for-ved && npm run dev
# http://localhost:30000

# B — UI
cd fe-experiment/bdui-client && npm run dev
# http://localhost:5173  (proxy /api → :30000)
```

Smoke (когда Nest уже up):

```bash
cd fe-experiment/backend-for-ved
node scripts/smoke-bdui-login.js
node scripts/smoke-bdui-upload.js
```

MinIO console (опционально): http://localhost:9001 (`minioadmin` / `minioadmin`), bucket `fea360`.

## Seed-аккаунты

| Email | Password | Role |
|-------|----------|------|
| user@bdui.local | BduiUser2024! | user |
| ico@bdui.local | BduiLifecycle2024! | internal_compliance_officer |
| eco@bdui.local | BduiLifecycle2024! | compliance_officer |
| manager@bdui.local | BduiLifecycle2024! | manager |
| provider@bdui.local | BduiLifecycle2024! | provider |

Организация User: `ООО BDUI Тест` (первая сделка → ICO) + `ООО BDUI Экспорт` (approved, СПб).

### Seed-справочники (E10)

| Сущность | Кол-во | Примечание |
|----------|--------|------------|
| Валюты (`currencies`) | 5 | rub, usd, eur, cny, usdt — wizard `GET /currency` |
| Организации User | 2 | Москва + СПб, `legalAddress` в select |
| Контрагенты User | 2 | foreign CN + RU, approved, bank geo |
| HS codes | 2 | 0101210000, 8471300000 |

Fixed lifecycle ids (`BDUI_SEED_*`) не меняются. E10 ids: org `…400002`, counterparty `…800001` / `…800002`.

Проверка: `node scripts/smoke-bdui-seed-directories.js` (Nest up + seed).

## UI

1. Открыть http://localhost:5173/login  
2. Выбрать роль в role picker (сверху на login)  
3. Войти seed-аккаунтом этой роли  
4. Список `/forms` → карточка `/forms/:id` → CTA из schema  
5. User: создание `/forms/new` (wizard)  
6. Смена роли: logout / снова login с другим picker  

Чеклист сквозного прогона: [`LIFECYCLE.md`](LIFECYCLE.md)

## BDUI контракт

| page | auth | назначение |
|------|------|------------|
| `login` | нет | форма входа |
| `forms.list` | JWT | таблица заявок |
| `forms.create` | JWT | wizard (User) |
| `forms.detail?status=` | JWT | карточка + action_bar |

`GET /api/1.0/bdui/schema/{role}/{page}`  
Роли: `user` \| `internal_compliance_officer` \| `compliance_officer` \| `manager` \| `provider`

## Тесты

```bash
cd fe-experiment/backend-for-ved
npm test -- --testPathPattern=modules/bdui --no-coverage
```

## Вне скоупа программы E1–E6

Refund ДС, Bank API, субагент/услуги как типы договоров, Diadoc UX, Admin/Superadmin, Figma-pixel UI.
