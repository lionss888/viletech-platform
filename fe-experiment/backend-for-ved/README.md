# Fea360

Backend-сервис для управления внешнеэкономической деятельностью (ВЭД).

## Описание

Fea360 — это комплексная система для управления внешнеэкономической деятельностью, включающая:
- Управление договорами и контрагентами
- Обработку заявок на оплату
- Интеграцию с электронным документооборотом (Диадок)
- Управление файлами и документами
- Работу с валютами и ликвидностью
- Систему уведомлений и аналитики

## Требования

- **Node.js** 18+ (рекомендуется 20+)
- **npm** или **yarn**
- **Docker** и **Docker Compose**
- **GraphicsMagick** и **Ghostscript** (для работы с PDF)

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
# или
yarn install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните необходимые переменные:

```bash
cp .env.example .env
```

**Обязательные переменные для локального запуска:**

| Переменная | Описание |
|------------|----------|
| `MONGODB_URL` | URL MongoDB (по умолчанию: `mongodb://127.0.0.1:27017/fea360`) |
| `REDIS_URL` | URL Redis (по умолчанию: `redis://127.0.0.1:6380`) |
| `NATS_URL` | URL NATS (по умолчанию: `nats://0.0.0.0:4222`) |
| `S3_ENDPOINT` | Endpoint S3-совместимого хранилища |
| `AWS_ACCESS_KEY_ID` | Ключ доступа S3 |
| `AWS_SECRET_ACCESS_KEY` | Секретный ключ S3 |
| `BUCKET_NAME` | Имя бакета S3 |
| `ADMIN_EMAIL` | Email root-пользователя |
| `ADMIN_PASSWORD` | Пароль root-пользователя |

**Переменные для интеграции с Диадоком (опционально):**

| Переменная | Описание |
|------------|----------|
| `DIADOC_ENABLED` | Включить интеграцию с Диадоком (`true`/`false`) |
| `DIADOC_API_URL` | URL Diadoc API (по умолчанию: `https://diadoc-api.kontur.ru`) |
| `DIADOC_API_CLIENT_ID` | Ключ разработчика Diadoc |
| `DIADOC_AUTH_TOKEN` | Токен аутентификации Diadoc |
| `DIADOC_BOX_ID` | Box ID организации в формате `box-id@diadoc.ru` |
| `DIADOC_WEBHOOK_SECRET` | Секрет для проверки webhook-запросов |
| `DIADOC_WEBHOOK_IP_WHITELIST` | Список разрешённых IP (через запятую) |

### 3. Запуск инфраструктуры

```bash
docker-compose up -d
```

Будут запущены:
- **MongoDB** (порт 27017)
- **Redis** (внешний порт 6380, внутренний 6379)
- **NATS** (порты 4222, 8222, 6222)
- **Gotenberg** (порт 3333)

### 4. Сборка и запуск

```bash
# Сборка
npm run build

# Запуск в development режиме (с hot-reload)
npm run dev

# Запуск в production режиме
npm run start:prod
```

### 5. Проверка

Сервер запускается на порту **30000** (по умолчанию).

- **Swagger UI:** http://localhost:30000/api/1.0/fea360/swagger
- **Health Check:** http://localhost:30000/api/1.0/diadoc/health

## Команды

| Команда | Описание |
|---------|----------|
| `npm run build` | Сборка проекта |
| `npm run dev` | Запуск в режиме разработки |
| `npm run start:prod` | Запуск в production |
| `npm run test` | Запуск unit-тестов |
| `npm run test:watch` | Тесты с отслеживанием изменений |
| `npm run test:cov` | Тесты с покрытием |
| `npm run test:real` | Запуск реальных тестов (с подключением к БД) |
| `npm run test:smoke` | Smoke-тесты |
| `npm run test:health` | Health check тесты |
| `npm run test:db-integration` | Интеграционные тесты БД |
| `npm run test:api-e2e` | E2E тесты API |
| `npm run test:unit` | Unit-тесты модуля Diadoc |
| `npm run lint` | Проверка линтером |
| `npm run lint:fix` | Автоисправление линтером |
| `npm run pretty` | Форматирование кода (Prettier) |
| `npm run check:api` | Проверка API endpoints |

## Тестирование

```bash
# Запуск всех unit-тестов
npm run test

# Запуск с отслеживанием изменений
npm run test:watch

# Тесты с покрытием
npm run test:cov

# Тесты модуля Diadoc
npm run test:unit

# Реальные тесты (требуют подключения к БД и сервисам)
npm run test:real

# Smoke-тесты
npm run test:smoke

# Health check тесты
npm run test:health

# Интеграционные тесты БД
npm run test:db-integration

# E2E тесты API
npm run test:api-e2e
```

## Структура проекта

```
src/
├── lib/                          # Общие библиотеки и утилиты
│   ├── bootstrap.ts              # Инициализация приложения
│   ├── modules/                  # Общие модули (S3, Shutdown, Auth и др.)
│   └── services/                 # Общие сервисы
├── modules/                      # Бизнес-модули
│   ├── account/                  # Управление аккаунтами
│   ├── agent/                    # Агенты
│   ├── auth/                     # Аутентификация
│   ├── code/                     # Коды
│   ├── comment/                  # Комментарии
│   ├── commission-calculation/   # Расчёт комиссий
│   ├── compliance-history/       # История комплаенса
│   ├── configuration/            # Конфигурация
│   ├── contract/                 # Договоры
│   ├── counterparty/              # Контрагенты
│   ├── currency/                 # Валюты и курсы
│   ├── diadoc/                   # Интеграция с Диадок (ЭДО) - VF-2
│   ├── file/                     # Работа с файлами
│   ├── form-payment/             # Заявки на оплату
│   ├── hs-code/                  # Коды ТН ВЭД
│   ├── liquidity/                # Ликвидность
│   ├── mail/                     # Почтовые уведомления
│   ├── organization/             # Организации
│   ├── payment/                  # Платежи
│   ├── payment-order-generation/ # Генерация платёжных поручений
│   ├── rate/                     # Курсы
│   ├── recognition/              # Распознавание
│   ├── socket/                   # WebSocket соединения
│   ├── telegram/                 # Интеграция с Telegram
│   ├── template/                 # Шаблоны документов
│   ├── token/                    # Токены
│   ├── treasurer-task/           # Задачи казначея
│   └── virtual-account/          # Виртуальные счета
└── main.ts                       # Точка входа
```

## Интеграция с Диадоком (VF-2)

Модуль для электронного документооборота через [Diadoc API](https://developer.kontur.ru/doc/diadoc-api/).

**Статус:** ✅ PREPRODUCTION-READY (готов к передаче в эксплуатацию)

### Возможности

- ✅ Отправка поручений на оплату, отчётов и договоров на подписание
- ✅ Генерация XML документов (Счёт-фактура, ТОРГ-12, Акт, УПД)
- ✅ Получение статуса подписания через webhook и периодическую проверку
- ✅ Скачивание подписанных документов
- ✅ Поиск организаций по ИНН
- ✅ Выбор способа подписи (manual/diadoc)
- ✅ Промежуточные статусы (REPORT_WAITING_DIADOC, WAITING_DIADOC)
- ✅ 3-дневное уведомление об истечении срока подписания
- ✅ Защита webhook (аутентификация, rate limiting, IP whitelist)

### Поддерживаемые типы документов

1. **Поручение на оплату** (Payment Order) — PDF
2. **Отчёт агента** (Agent Report) — PDF
3. **Договор** (Contract) — PDF
4. **Счёт-фактура** (Invoice) — XML
5. **ТОРГ-12** (Torg12) — XML
6. **Акт выполненных работ** (AcceptanceCertificate) — XML
7. **УПД** (UniversalTransferDocument) — XML

### Настройка

Добавьте в `.env`:

```bash
DIADOC_ENABLED=true
DIADOC_API_URL=https://diadoc-api.kontur.ru
DIADOC_API_CLIENT_ID=ваш-ключ-разработчика
DIADOC_AUTH_TOKEN=ваш-токен
DIADOC_BOX_ID=ваш-box-id@diadoc.ru
DIADOC_WEBHOOK_SECRET=секрет-для-webhook
DIADOC_WEBHOOK_IP_WHITELIST=1.2.3.4,5.6.7.0/24
```

Настройте webhook в Diadoc: `https://ваш-домен/api/1.0/diadoc/webhook`

### API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/1.0/diadoc/webhook` | Webhook для событий от Diadoc (защищён) |
| GET | `/api/1.0/diadoc/health` | Проверка здоровья интеграции |
| GET | `/api/1.0/diadoc/metrics` | Метрики интеграции |
| POST | `/api/1.0/diadoc/check-status` | Принудительная проверка статуса |

### Документация модуля

- [README.md](src/modules/diadoc/README.md) — описание и использование
- [ARCHITECTURE.md](src/modules/diadoc/ARCHITECTURE.md) — архитектура
- [API.md](src/modules/diadoc/API.md) — описание методов API
- [DIAGRAMS.md](src/modules/diadoc/docs/DIAGRAMS.md) — диаграммы workflow
- [ОТЧЕТ_ГОТОВНОСТИ_DIADOC_ИНТЕГРАЦИИ_2026-01-14.md](ОТЧЕТ_ГОТОВНОСТИ_DIADOC_ИНТЕГРАЦИИ_2026-01-14.md) — отчёт о готовности

## Загрузка валют

Курсы валют обновляются при запуске приложения.

Источники:
- **CBR** — Центральный банк России (`CBR_URL`)
- **OpenExchange** — требует `OPENEXCHANGE_APP_ID`

Для включения cron-обновлений в dev-режиме:
```bash
CURRENCY_CRON_CBR_IN_DEV=true
CURRENCY_CRON_OPENEXCHANGE_IN_DEV=true
```

## Установка GraphicsMagick

Для работы с PDF требуется GraphicsMagick:

```bash
# macOS
brew install graphicsmagick ghostscript

# Ubuntu/Debian
sudo apt-get install graphicsmagick ghostscript
```

[Подробная инструкция](https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md)

## Технологический стек

- **Framework:** NestJS 9.x
- **Язык:** TypeScript 5.x
- **База данных:** MongoDB 7.x
- **Кэш/Очереди:** Redis 7.x, Bull
- **Message Broker:** NATS
- **Файловое хранилище:** S3-совместимое (MinIO)
- **PDF обработка:** Gotenberg, GraphicsMagick
- **Тестирование:** Jest
- **Документация API:** Swagger/OpenAPI

## Архитектура

Проект построен на принципах модульной архитектуры:
- Разделение на бизнес-модули
- Общие библиотеки и утилиты в `lib/`
- Микросервисная архитектура через NATS
- WebSocket поддержка через Socket.IO
- Очереди задач через Bull/Redis

---

**Порт:** 30000  
**Swagger:** http://localhost:30000/api/1.0/fea360/swagger  
**Health Check:** http://localhost:30000/api/1.0/diadoc/health
