# VF-2: Интеграция с Диадоком для ЭДО

Модуль интеграции с [Diadoc API](https://developer.kontur.ru/doc/diadoc-api/) для электронного документооборота (ЭДО).

## Содержание

- [Описание](#описание)
- [Возможности](#возможности)
- [Установка и настройка](#установка-и-настройка)
- [Использование](#использование)
- [API Endpoints](#api-endpoints)
- [Workflow интеграции](#workflow-интеграции)
- [Обработка ошибок](#обработка-ошибок)
- [Метрики и мониторинг](#метрики-и-мониторинг)
- [Troubleshooting](#troubleshooting)

## Описание

Модуль обеспечивает интеграцию с сервисом Диадок (Контур) для:
- Отправки документов на подписание контрагентам
- Получения статуса подписания документов
- Скачивания подписанных документов
- Обработки webhook-уведомлений от Диадока

### Поддерживаемые типы документов

1. **Поручение на оплату** (Payment Order) - формируется в FormPayment
2. **Отчёт агента** (Agent Report) - формируется в FormPayment
3. **Договор** (Contract) - формируется в Contract

## Возможности

- ✅ Аутентификация через DiadocAuth (ddauth_api_client_id + ddauth_token)
- ✅ Загрузка и отправка документов (PostMessage V3)
- ✅ Получение статуса документов (GetMessage V6)
- ✅ Скачивание подписанных документов (GetEntityContent V4)
- ✅ Поиск организаций по ИНН (GetOrganizationsByInnKpp)
- ✅ Обработка webhook-уведомлений
- ✅ Периодическая проверка статусов (fallback для webhook)
- ✅ Retry-механизм с exponential backoff
- ✅ Обработка rate limiting (429) с Retry-After
- ✅ Метрики и мониторинг
- ✅ Health check endpoint
- ✅ **VF-2: Генерация XML документов** (Invoice, Torg12, AcceptanceCertificate, УПД и др.)
- ✅ **VF-2: Промежуточные статусы** (REPORT_WAITING_DIADOC, WAITING_DIADOC)
- ✅ **VF-2: Системный инвариант выбора способа подписи** (manual/diadoc)

## Установка и настройка

### 1. Переменные окружения

Добавьте следующие переменные в файл `.env`:

```bash
# Включение интеграции
DIADOC_ENABLED=true

# URL API Диадока
DIADOC_API_URL=https://diadoc-api.kontur.ru

# Ключ разработчика (ddauth_api_client_id)
# Получить: https://developer.kontur.ru/
DIADOC_API_CLIENT_ID=ваш-guid-ключа-разработчика

# Авторизационный токен (если есть постоянный токен)
DIADOC_AUTH_TOKEN=ваш-токен

# Или логин/пароль для получения токена
DIADOC_LOGIN=логин
DIADOC_PASSWORD=пароль

# ID ящика вашей организации
DIADOC_BOX_ID=ваш-box-id@diadoc.ru

# Опциональные настройки
DIADOC_TIMEOUT=60000
DIADOC_MAX_RETRIES=3
DIADOC_STATUS_CHECK_INTERVAL=*/5 * * * *
```

### 2. Получение ключа разработчика

1. Зарегистрируйтесь на [developer.kontur.ru](https://developer.kontur.ru/)
2. Создайте приложение
3. Получите `ddauth_api_client_id` (GUID)

### 3. Получение BoxId организации

BoxId можно получить:
- В личном кабинете Диадока
- Через API метод `GetMyOrganizations`
- Через нашу интеграцию после аутентификации

### 4. Настройка Webhook

Для получения уведомлений о статусе документов настройте webhook в Диадоке:

1. URL: `https://ваш-домен/api/1.0/diadoc/webhook` (где `1.0` - версия API)
2. События: изменение статуса документа
3. Формат: JSON

**Заголовки безопасности** (если настроены):
- `X-Diadoc-Webhook-Secret` - секретный ключ
- `X-Diadoc-Webhook-Timestamp` - Unix timestamp для replay protection
- `X-Diadoc-Webhook-Nonce` - уникальный ID запроса

## Использование

### Отправка поручения на оплату

```typescript
import { FormPaymentService } from '../form-payment/service/form-payment.service';

// В контроллере или сервисе
const updatedFormPayment = await formPaymentService.signPaymentOrderViaDiadoc(
  { _id: formPaymentId },
  recipientInn, // ИНН контрагента
);

console.log('Document ID:', updatedFormPayment.docs.paymentOrderDiadocDocumentId);
```

### Отправка отчёта

```typescript
const updatedFormPayment = await formPaymentService.signReportViaDiadoc(
  { _id: formPaymentId },
  recipientInn,
);
```

### Отправка договора

```typescript
import { ContractService } from '../contract/service/contract.service';

const updatedContract = await contractService.signContractViaDiadoc(
  { _id: contractId },
  recipientInn,
);
```

### Прямое использование DiadocService

```typescript
import { Inject } from '@nestjs/common';
import { DIADOC_SERVICE } from './diadoc.constants';
import { IDiadocService } from './service/diadoc.service.interface';

@Injectable()
export class MyService {
  constructor(
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
  ) {}

  async uploadDocument(fileBuffer: Buffer, fileName: string) {
    // Загрузка документа
    const result = await this.diadocService.uploadDocument(
      fileBuffer,
      fileName,
      'application/pdf',
      recipientBoxId, // опционально
    );

    console.log('Message ID:', result.messageId);
    console.log('Entity ID:', result.entityId);

    return result;
  }

  async checkStatus(messageId: string) {
    const status = await this.diadocService.getDocumentStatus(messageId);
    console.log('Status:', status);
    return status;
  }
}
```

## API Endpoints

> **Примечание**: Все endpoints имеют global prefix `/api/1.0/` (где `1.0` - версия API из конфигурации).

### POST /api/1.0/diadoc/webhook

Webhook для получения уведомлений от Диадока. Защищён DiadocWebhookGuard.

**Request Body:**
```json
{
  "documentId": "message-id-from-diadoc",
  "status": "signed",
  "messageId": "optional-message-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order status updated"
}
```

### GET /diadoc/health

Проверка здоровья интеграции.

**Response:**
```json
{
  "enabled": true,
  "configured": true,
  "apiReachable": true,
  "authenticated": true,
  "lastCheck": "2025-01-15T10:30:00Z"
}
```

### GET /diadoc/metrics

Получение метрик интеграции.

**Response:**
```json
{
  "current": {
    "documentsSent": {
      "paymentOrder": 150,
      "report": 75,
      "contract": 30
    },
    "documentsSigned": 200,
    "documentsRejected": 5,
    "errors": {
      "temporary": 10,
      "permanent": 2,
      "timeout": 3,
      "auth": 0,
      "rateLimit": 1
    }
  },
  "averageRequestDurations": {
    "authenticate": 250,
    "uploadDocument": 1500,
    "sendForSigning": 800,
    "getDocumentStatus": 300,
    "getSignedDocument": 2000
  },
  "statusChecker": {
    "successCount": 500,
    "errorCount": 5,
    "cacheHitCount": 1000,
    "cacheSize": 50,
    "lastRunTime": "2025-01-15T10:25:00Z"
  }
}
```

### POST /diadoc/check-status

Принудительная проверка статуса документа.

**Request Body:**
```json
{
  "documentId": "message-id-from-diadoc"
}
```

**Response:**
```json
{
  "documentId": "message-id-from-diadoc",
  "status": "signed",
  "checkedAt": "2025-01-15T10:30:00Z"
}
```

## Workflow интеграции

### Отправка документа на подписание

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  FEA API    │────▶│DiadocService│────▶│ Diadoc API  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           │  1. uploadDocument│                   │
                           │──────────────────▶│  PostMessage V3   │
                           │                   │──────────────────▶│
                           │                   │◀──────────────────│
                           │  2. Сохранить ID  │   messageId       │
                           │◀──────────────────│                   │
```

### Получение статуса через Webhook

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Diadoc API  │────▶│  FEA API    │────▶│  Webhook    │────▶│   Service   │
│  (webhook)  │     │  /webhook   │     │  Processor  │     │  (update)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │ POST /webhook     │                   │                   │
      │──────────────────▶│  processWebhook   │                   │
      │                   │──────────────────▶│  updateStatus     │
      │                   │                   │──────────────────▶│
      │                   │                   │  downloadSigned   │
      │                   │                   │──────────────────▶│
```

### Статусы документов

| Внутренний статус | Описание |
|-------------------|----------|
| `draft` | Черновик |
| `sent` | Отправлен |
| `waiting_for_recipient_signature` | Ожидает подписи |
| `signed` | Подписан |
| `rejected` | Отклонён |
| `cancelled` | Отменён |
| `error` | Ошибка |
| `unknown` | Неизвестный |

### VF-2: Промежуточные статусы FormPayment

| Статус | Описание |
|--------|----------|
| `report_waiting_diadoc` | Отчёт отправлен на подписание в ЭДО |

### VF-2: Промежуточные статусы Contract

| Статус | Описание |
|--------|----------|
| `waiting_diadoc` | Договор отправлен на подписание в ЭДО |

### VF-2: Генерация XML документов

Модуль поддерживает генерацию следующих типов XML документов согласно форматам ФНС/Диадок:

| Тип документа | Описание | TypeNamedId |
|---------------|----------|-------------|
| `Invoice` | Счёт-фактура | `Invoice` |
| `Torg12` | ТОРГ-12 | `Torg12` |
| `AcceptanceCertificate` | Акт выполненных работ | `AcceptanceCertificate` |
| `UniversalTransferDocument` | УПД (универсальный передаточный документ) | `UniversalTransferDocument` |
| `XmlTorg12` | XML ТОРГ-12 | `XmlTorg12` |
| `XmlAcceptanceCertificate` | XML Акт выполненных работ | `XmlAcceptanceCertificate` |

#### Пример использования генерации XML

**Важно:** XML генерация предназначена для формализованных документов:
- Счета-фактуры (Invoice)
- ТОРГ-12 (Torg12)
- Акты выполненных работ (AcceptanceCertificate)
- УПД (UniversalTransferDocument)
- XmlTorg12, XmlAcceptanceCertificate

**Для поручений на оплату и отчётов агента используется метод `uploadDocument()` с готовыми PDF файлами**, так как эти документы генерируются системой в формате PDF, а не XML.

```typescript
import { DiadocXmlGeneratorService } from './service/diadoc-xml-generator.service';
import { DiadocXmlDocumentType } from './types/diadoc-api.types';

@Injectable()
export class MyService {
  constructor(
    private readonly xmlGenerator: DiadocXmlGeneratorService,
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
  ) {}

  async sendInvoice(formPayment: IFormPayment, recipientBoxId: string) {
    // Загрузка XML документа через новый метод (для счёта-фактуры)
    const result = await this.diadocService.uploadXmlDocument(
      formPayment,
      DiadocXmlDocumentType.INVOICE,
      recipientBoxId,
    );

    return result;
  }

  async sendPaymentOrder(fileBuffer: Buffer, fileName: string, recipientBoxId: string) {
    // Для поручения на оплату используется uploadDocument() с PDF файлом
    const result = await this.diadocService.uploadDocument(
      fileBuffer,
      fileName,
      'application/pdf',
      recipientBoxId,
      true,
    );

    return result;
  }
}
```

### VF-2: Установка способа подписи

Для установки способа подписи документов используйте endpoint:

```http
PATCH /api/1.0/form-payment/:_id/sign-method
Content-Type: application/json

{
  "paymentOrderSignMethod": "diadoc",
  "reportSignMethod": "manual"
}
```

**Response:**
```json
{
  "paymentOrderSignMethod": "diadoc",
  "reportSignMethod": "manual",
  "canChangePaymentOrderSignMethod": true,
  "canChangeReportSignMethod": true
}
```

**Важно:** Нельзя изменить способ подписи после отправки документа в ЭДО.

## Обработка ошибок

### Коды ошибок

| Код | Описание | Retryable |
|-----|----------|-----------|
| `AUTH_ERROR` | Ошибка аутентификации | Нет |
| `INVALID_TOKEN` | Недействительный токен | Нет |
| `TOKEN_EXPIRED` | Токен истёк | Да* |
| `INVALID_API_CLIENT_ID` | Неверный ключ разработчика | Нет |
| `BOX_NOT_FOUND` | Ящик не найден | Нет |
| `DOCUMENT_NOT_FOUND` | Документ не найден | Нет |
| `COUNTERPARTY_NOT_FOUND` | Контрагент не найден | Нет |
| `ACCESS_DENIED` | Недостаточно прав | Нет |
| `RATE_LIMIT_EXCEEDED` | Превышен лимит запросов | Да |
| `SERVICE_UNAVAILABLE` | Сервис недоступен | Да |
| `TIMEOUT` | Таймаут | Да |
| `NETWORK_ERROR` | Сетевая ошибка | Да |

*Токен автоматически обновляется

### Retry-механизм

- **Exponential backoff**: 1s → 2s → 4s → 8s (max 30s)
- **Максимум попыток**: 3 (настраивается)
- **Rate limiting**: используется заголовок Retry-After

## Метрики и мониторинг

### Хранение метрик

Метрики хранятся в MongoDB в коллекции `diadoc_metrics`:
- `current` - текущие метрики (обновляются каждые 5 минут)
- `hourly` - почасовые агрегаты (хранятся 7 дней)
- `daily` - дневные агрегаты (хранятся 30 дней)

### Алерты

Рекомендуется настроить алерты на:
- `errors.auth > 0` - проблемы с аутентификацией
- `errors.rateLimit > 10/hour` - превышение лимитов
- `healthCheck.apiReachable = false` - недоступность API

## Troubleshooting

### Ошибка аутентификации

```
Error: Diadoc authentication credentials are not configured
```

**Решение**: Проверьте переменные окружения `DIADOC_API_CLIENT_ID` и `DIADOC_AUTH_TOKEN` (или `DIADOC_LOGIN`/`DIADOC_PASSWORD`).

### Контрагент не найден

```
Error: Recipient organization not found for INN: 1234567890
```

**Решение**: 
1. Проверьте правильность ИНН
2. Убедитесь, что организация зарегистрирована в Диадоке
3. Проверьте роуминг между операторами ЭДО

### Rate limiting

```
Error: Rate limit exceeded (HTTP 429)
```

**Решение**: Система автоматически повторит запрос после задержки. Если ошибки частые, увеличьте интервал между запросами.

### Документ не найден

```
Error: Document not found for Diadoc documentId: xxx
```

**Решение**: 
1. Проверьте, что webhook настроен правильно
2. Убедитесь, что documentId соответствует отправленному документу

### Логирование

Для отладки включите debug-логи:

```bash
LOG_LEVEL=debug
```

Логи содержат:
- Все HTTP запросы к Diadoc API
- Статусы документов
- Ошибки с полным стеком

---

**Автор**: Специалист оператор + Ассистент [бот коммерческий]

**Интеллектуальные права** принадлежат ООО «Иннотек Лабс»

**Документация Diadoc API**: https://developer.kontur.ru/doc/diadoc-api/
