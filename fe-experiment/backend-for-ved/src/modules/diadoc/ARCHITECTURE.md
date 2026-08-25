# Архитектура модуля Diadoc

## Обзор

Модуль Diadoc построен на основе принципов чистой архитектуры с разделением на слои:
- **Web Layer** - контроллеры для HTTP API
- **Service Layer** - бизнес-логика интеграции
- **Data Layer** - схемы и миграции MongoDB

## Диаграмма компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│                        DiadocModule                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Web Layer                             │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐ │  │
│  │  │DiadocController │  │     DTO (Webhook, Status)       │ │  │
│  │  │  - webhook      │  │                                 │ │  │
│  │  │  - health       │  │                                 │ │  │
│  │  │  - metrics      │  │                                 │ │  │
│  │  └────────┬────────┘  └─────────────────────────────────┘ │  │
│  └───────────┼───────────────────────────────────────────────┘  │
│              │                                                   │
│  ┌───────────▼───────────────────────────────────────────────┐  │
│  │                    Service Layer                           │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐ │  │
│  │  │  DiadocService  │  │ DiadocWebhookProcessorService   │ │  │
│  │  │  (DIADOC_SERVICE)│  │                                 │ │  │
│  │  └────────┬────────┘  └────────────────┬────────────────┘ │  │
│  │           │                             │                  │  │
│  │  ┌────────▼────────┐  ┌────────────────▼────────────────┐ │  │
│  │  │DiadocMetrics    │  │ DiadocStatusCheckerService      │ │  │
│  │  │Service          │  │ (Cron Job)                      │ │  │
│  │  └─────────────────┘  └─────────────────────────────────┘ │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              DiadocErrorHandler                      │  │  │
│  │  │  - classifyError()                                   │  │  │
│  │  │  - handleError()                                     │  │  │
│  │  │  - shouldRetry()                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Data Layer                              │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐ │  │
│  │  │DiadocMetrics    │  │    Interface & Types            │ │  │
│  │  │Schema (MongoDB) │  │  - IDiadocService               │ │  │
│  │  │                 │  │  - DiadocDocumentStatus         │ │  │
│  │  │                 │  │  - DiadocErrorCode              │ │  │
│  │  └─────────────────┘  └─────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Структура файлов

```
src/modules/diadoc/
├── diadoc.module.ts              # Главный модуль
├── diadoc.constants.ts           # Константы (токены DI)
├── README.md                     # Документация
├── ARCHITECTURE.md               # Этот файл
├── API.md                        # Документация API
│
├── dto/                          # Data Transfer Objects
│   ├── diadoc-webhook.dto.ts     # DTO для webhook
│   ├── diadoc-status.dto.ts      # DTO для статуса
│   └── diadoc-sign-document.dto.ts
│
├── service/                      # Сервисы
│   ├── diadoc.service.ts         # Главный сервис API
│   ├── diadoc.service.interface.ts # Интерфейсы и типы
│   ├── diadoc.service.module.ts  # Модуль сервисов
│   ├── diadoc.service.spec.ts    # Unit-тесты
│   │
│   ├── diadoc-webhook-processor.service.ts  # Обработчик webhook
│   ├── diadoc-status-checker.service.ts     # Периодическая проверка
│   ├── diadoc-metrics.service.ts            # Сервис метрик
│   ├── diadoc-metrics.schema.ts             # Схема MongoDB
│   └── diadoc-error-handler.ts              # Обработчик ошибок
│
└── web/                          # HTTP контроллеры
    ├── diadoc.controller.ts      # Контроллер
    └── diadoc.controller.spec.ts # Unit-тесты
```

## Сервисы

### DiadocService

Главный сервис для взаимодействия с Diadoc API.

**Ответственность:**
- Аутентификация (получение токена)
- Загрузка документов (PostMessage V3)
- Получение статуса (GetMessage V6)
- Скачивание подписанных документов
- Поиск организаций по ИНН
- Метрики и health check

**Зависимости:**
- HttpService (для HTTP запросов)
- ConfigService (для конфигурации)

### DiadocWebhookProcessorService

Обработка изменений статуса документов.

**Ответственность:**
- Обработка webhook от Diadoc
- Обновление статуса документов в БД
- Скачивание и сохранение подписанных документов
- Идемпотентность обработки

**Зависимости:**
- DiadocService
- FormPaymentService
- ContractService
- FileService

### DiadocStatusCheckerService

Периодическая проверка статусов (fallback для webhook).

**Ответственность:**
- Cron-задача проверки статусов
- Батчинг запросов
- Кэширование статусов
- Приоритизация документов

**Оптимизации:**
- Batch size: 10 документов
- Max parallel requests: 5
- Cache TTL: 2 минуты
- Min wait time: 1 минута после отправки

### DiadocMetricsService

Сбор и хранение метрик.

**Ответственность:**
- Инкремент счётчиков
- Агрегация по периодам (hourly, daily)
- Очистка устаревших данных
- Персистентность в MongoDB

### DiadocErrorHandler

Централизованная обработка ошибок.

**Ответственность:**
- Классификация ошибок по HTTP статусу
- Определение retryable ошибок
- Генерация пользовательских сообщений
- Извлечение Retry-After

## Схема базы данных

### Поля в Contract

```typescript
interface Contract {
  // ... существующие поля ...
  
  // VF-2: Поля для интеграции с Diadoc
  diadocDocumentId?: string;    // ID сообщения в Diadoc
  diadocMessageId?: string;     // ID сообщения (синоним)
  signatureType?: 'manual' | 'diadoc';  // Тип подписи
  diadocSignedAt?: Date;        // Время подписания
}
```

### Поля в FormPayment.docs

```typescript
interface DocsForm {
  // ... существующие поля ...
  
  // VF-2: Поля для поручения на оплату
  paymentOrderDiadocDocumentId?: string;
  paymentOrderDiadocMessageId?: string;
  
  // VF-2: Поля для отчёта
  reportDiadocDocumentId?: string;
  reportDiadocMessageId?: string;
}
```

### Коллекция diadoc_metrics

```typescript
interface DiadocMetricsRecord {
  type: 'current' | 'hourly' | 'daily';
  timestamp: Date;
  metrics: {
    documentsSent: {
      paymentOrder: number;
      report: number;
      contract: number;
    };
    documentsSigned: number;
    documentsRejected: number;
    errors: {
      temporary: number;
      permanent: number;
      timeout: number;
      auth: number;
      rateLimit: number;
    };
    requestDurations: {
      authenticate: number[];
      uploadDocument: number[];
      // ...
    };
  };
  period?: {
    start: Date;
    end: Date;
  };
}
```

## Интеграция с другими модулями

### FormPaymentModule

```
FormPaymentService
    │
    ├── signPaymentOrderViaDiadoc()
    │   └── DiadocService.uploadDocument()
    │
    ├── signReportViaDiadoc()
    │   └── DiadocService.uploadDocument()
    │
    └── findOneByPaymentOrderDiadocDocumentId()
        └── Используется в DiadocWebhookProcessor
```

### ContractModule

```
ContractService
    │
    ├── signContractViaDiadoc()
    │   └── DiadocService.uploadDocument()
    │
    └── findOneByDiadocDocumentId()
        └── Используется в DiadocWebhookProcessor
```

### FileModule

```
FileService
    │
    └── baseUpload()
        └── Сохранение подписанных документов
```

## Потоки данных

### Отправка документа

```
1. Client → FormPaymentController.signPaymentOrder()
2. FormPaymentService.signPaymentOrderViaDiadoc()
3. FileService.getFileBuffer() → получение файла
4. DiadocService.getBoxIdByInn() → получение BoxId контрагента
5. DiadocService.uploadDocument() → отправка в Diadoc
6. FormPaymentService.updateOne() → сохранение documentId
7. DiadocService.recordDocumentSent() → метрика
```

### Обработка Webhook

```
1. Diadoc → POST /diadoc/webhook
2. DiadocController.handleWebhook()
3. FormPaymentService.findOneByPaymentOrderDiadocDocumentId()
4. DiadocWebhookProcessor.processFormPaymentPaymentOrderStatusChange()
5. DiadocService.getSignedDocument() → скачивание
6. FileService.baseUpload() → сохранение
7. FormPaymentService.updateOne() → обновление статуса
8. DiadocService.recordDocumentSigned() → метрика
```

### Периодическая проверка

```
1. Cron (каждые 5 минут)
2. DiadocStatusCheckerService.checkDiadocDocumentStatuses()
3. MongoDB.find() → поиск ожидающих документов
4. DiadocService.getDocumentStatus() → проверка статуса
5. DiadocWebhookProcessor.process*StatusChange() → обработка
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| DIADOC_ENABLED | Включение интеграции | false |
| DIADOC_API_URL | URL API | https://diadoc-api.kontur.ru |
| DIADOC_API_CLIENT_ID | Ключ разработчика | - |
| DIADOC_AUTH_TOKEN | Авторизационный токен | - |
| DIADOC_LOGIN | Логин (если нет токена) | - |
| DIADOC_PASSWORD | Пароль (если нет токена) | - |
| DIADOC_BOX_ID | ID ящика организации | - |
| DIADOC_TIMEOUT | Таймаут запросов (мс) | 60000 |
| DIADOC_MAX_RETRIES | Макс. попыток | 3 |
| DIADOC_STATUS_CHECK_INTERVAL | Интервал проверки (cron) | */5 * * * * |

## Безопасность

### Аутентификация

- Токен авторизации кэшируется на 23 часа
- При ошибке 401 токен автоматически обновляется
- Пароли не логируются

### Валидация

- ИНН валидируется перед запросом
- BoxId проверяется на наличие
- Размер файла не ограничивается (ограничение на стороне Diadoc)

### Логирование

- Чувствительные данные маскируются (***последние 4 символа)
- Ошибки логируются с полным стеком
- Debug-логи содержат детали запросов

---

**Автор**: Специалист оператор + Ассистент [бот коммерческий]

**Интеллектуальные права** принадлежат ООО «Иннотек Лабс»
