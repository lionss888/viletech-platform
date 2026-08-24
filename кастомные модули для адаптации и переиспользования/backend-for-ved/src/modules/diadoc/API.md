# API документация модуля Diadoc

## Содержание

- [IDiadocService](#idiadocservice)
- [HTTP Endpoints](#http-endpoints)
- [Webhook Format](#webhook-format)
- [Типы и Enums](#типы-и-enums)
- [Коды ошибок](#коды-ошибок)

---

## IDiadocService

Главный интерфейс сервиса Diadoc. Инжектится через токен `DIADOC_SERVICE`.

```typescript
import { Inject } from '@nestjs/common';
import { DIADOC_SERVICE } from './diadoc.constants';
import { IDiadocService } from './service/diadoc.service.interface';

@Injectable()
class MyService {
  constructor(
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
  ) {}
}
```

### authenticate()

Аутентификация в Diadoc API. Получает авторизационный токен.

```typescript
authenticate(): Promise<string>
```

**Возвращает:** Авторизационный токен (ddauth_token)

**Исключения:**
- `DiadocError` с кодом `AUTH_ERROR` - при ошибке аутентификации
- `DiadocError` с кодом `INVALID_API_CLIENT_ID` - если ключ разработчика не настроен

**Пример:**
```typescript
const token = await diadocService.authenticate();
console.log('Authenticated, token:', token.substring(0, 10) + '...');
```

---

### uploadDocument()

Загрузка документа в Diadoc и отправка получателю.

```typescript
uploadDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  recipientBoxId?: string,
): Promise<DiadocUploadResult>
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| fileBuffer | Buffer | Да | Содержимое файла |
| fileName | string | Да | Имя файла |
| mimeType | string | Да | MIME-тип (например, 'application/pdf') |
| recipientBoxId | string | Нет | BoxId получателя |

**Возвращает:**
```typescript
interface DiadocUploadResult {
  messageId: string;    // ID сообщения в Diadoc
  documentId?: string;  // ID документа (синоним messageId)
  entityId?: string;    // ID сущности документа
}
```

**Исключения:**
- `DiadocError` с кодом `INVALID_REQUEST` - неверные параметры
- `DiadocError` с кодом `FILE_TOO_LARGE` - файл слишком большой
- `DiadocError` с кодом `COUNTERPARTY_NOT_FOUND` - получатель не найден

**Пример:**
```typescript
const fileBuffer = await fs.readFile('document.pdf');
const result = await diadocService.uploadDocument(
  fileBuffer,
  'document.pdf',
  'application/pdf',
  'recipient-box-id@diadoc.ru',
);
console.log('Uploaded:', result.messageId);
```

---

### sendForSigning()

Отправка документа на подписание контрагенту.

```typescript
sendForSigning(
  documentId: string,
  boxId: string,
  recipientInn: string,
): Promise<string>
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| documentId | string | Да | ID документа (messageId) |
| boxId | string | Да | BoxId отправителя |
| recipientInn | string | Да | ИНН получателя |

**Возвращает:** ID сообщения

**Исключения:**
- `DiadocError` с кодом `COUNTERPARTY_NOT_FOUND` - получатель не найден
- `DiadocError` с кодом `DOCUMENT_NOT_FOUND` - документ не найден

**Пример:**
```typescript
const messageId = await diadocService.sendForSigning(
  'document-id',
  'my-box-id@diadoc.ru',
  '1234567890', // ИНН контрагента
);
```

---

### getDocumentStatus()

Получение статуса документа.

```typescript
getDocumentStatus(
  messageId: string,
  entityId?: string,
): Promise<DiadocDocumentStatus>
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| messageId | string | Да | ID сообщения |
| entityId | string | Нет | ID сущности документа |

**Возвращает:** Статус документа (см. [DiadocDocumentStatus](#diadocdocumentstatus))

**Пример:**
```typescript
const status = await diadocService.getDocumentStatus('message-id');
if (status === DiadocDocumentStatus.SIGNED) {
  console.log('Document is signed!');
}
```

---

### getDocumentInfo()

Получение полной информации о документе.

```typescript
getDocumentInfo(
  messageId: string,
  entityId?: string,
): Promise<DiadocDocumentInfo>
```

**Возвращает:**
```typescript
interface DiadocDocumentInfo {
  messageId: string;
  documentId: string;
  entityId?: string;
  status: DiadocDocumentStatus;
  fileName?: string;
  createdAt?: Date;
  signedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}
```

---

### getSignedDocument()

Скачивание подписанного документа.

```typescript
getSignedDocument(
  messageId: string,
  entityId?: string,
): Promise<Buffer>
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| messageId | string | Да | ID сообщения |
| entityId | string | Нет | ID сущности (если не указан, определяется автоматически) |

**Возвращает:** Buffer с содержимым подписанного документа

**Пример:**
```typescript
const buffer = await diadocService.getSignedDocument('message-id');
await fs.writeFile('signed-document.pdf', buffer);
```

---

### getOrganizationsByInn()

Поиск организаций по ИНН.

```typescript
getOrganizationsByInn(
  inn: string,
  kpp?: string,
): Promise<DiadocOrganization[]>
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| inn | string | Да | ИНН организации |
| kpp | string | Нет | КПП организации |

**Возвращает:**
```typescript
interface DiadocOrganization {
  orgId: string;
  inn: string;
  kpp?: string;
  fullName: string;
  shortName?: string;
  boxes: DiadocBox[];
}

interface DiadocBox {
  boxId: string;
  title: string;
}
```

**Пример:**
```typescript
const orgs = await diadocService.getOrganizationsByInn('1234567890');
if (orgs.length > 0) {
  console.log('BoxId:', orgs[0].boxes[0].boxId);
}
```

---

### getBoxIdByInn()

Получение BoxId организации по ИНН (с кэшированием).

```typescript
getBoxIdByInn(inn: string, kpp?: string): Promise<string | null>
```

**Возвращает:** BoxId или null, если организация не найдена

---

### checkHealth()

Проверка здоровья интеграции.

```typescript
checkHealth(): Promise<DiadocHealthStatus>
```

**Возвращает:**
```typescript
interface DiadocHealthStatus {
  enabled: boolean;
  configured: boolean;
  apiReachable: boolean;
  authenticated: boolean;
  lastCheck: Date;
  error?: string;
}
```

---

### getMetrics()

Получение текущих метрик.

```typescript
getMetrics(): DiadocMetrics
```

**Возвращает:**
```typescript
interface DiadocMetrics {
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
    sendForSigning: number[];
    getDocumentStatus: number[];
    getSignedDocument: number[];
    getOrganizationByInn: number[];
  };
  lastUpdated?: Date;
}
```

---

### recordDocumentSent()

Запись метрики отправленного документа.

```typescript
recordDocumentSent(type: 'paymentOrder' | 'report' | 'contract'): void
```

---

### recordDocumentSigned()

Запись метрики подписанного документа.

```typescript
recordDocumentSigned(): void
```

---

### recordDocumentRejected()

Запись метрики отклонённого документа.

```typescript
recordDocumentRejected(): void
```

---

## HTTP Endpoints

### POST /diadoc/webhook

Webhook для получения событий от Diadoc.

**Request:**
```http
POST /diadoc/webhook HTTP/1.1
Content-Type: application/json

{
  "documentId": "message-id-123",
  "status": "signed",
  "messageId": "message-id-123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment order status updated"
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Document not found"
}
```

---

### GET /diadoc/health

Проверка здоровья интеграции.

**Response (200):**
```json
{
  "enabled": true,
  "configured": true,
  "apiReachable": true,
  "authenticated": true,
  "lastCheck": "2025-01-15T10:30:00.000Z"
}
```

---

### GET /diadoc/metrics

Получение метрик.

**Response (200):**
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
    },
    "lastUpdated": "2025-01-15T10:30:00.000Z"
  },
  "averageRequestDurations": {
    "authenticate": 250,
    "uploadDocument": 1500,
    "sendForSigning": 800,
    "getDocumentStatus": 300,
    "getSignedDocument": 2000,
    "getOrganizationByInn": 400
  },
  "statusChecker": {
    "successCount": 500,
    "errorCount": 5,
    "cacheHitCount": 1000,
    "cacheSize": 50,
    "lastRunTime": "2025-01-15T10:25:00.000Z"
  }
}
```

---

### POST /diadoc/metrics/reset

Сброс метрик (для тестирования).

**Response (200):**
```json
{
  "success": true
}
```

---

### POST /diadoc/check-status

Принудительная проверка статуса документа.

**Request:**
```http
POST /diadoc/check-status HTTP/1.1
Content-Type: application/json

{
  "documentId": "message-id-123"
}
```

**Response (200):**
```json
{
  "documentId": "message-id-123",
  "status": "signed",
  "checkedAt": "2025-01-15T10:30:00.000Z"
}
```

---

## Webhook Format

### Структура payload

```typescript
interface DiadocWebhookDto {
  documentId: string;  // ID документа (обязательно)
  status: DiadocDocumentStatus;  // Статус (обязательно)
  messageId?: string;  // ID сообщения (опционально)
}
```

### Примеры событий

**Документ подписан:**
```json
{
  "documentId": "msg-123-456",
  "status": "signed",
  "messageId": "msg-123-456"
}
```

**Документ отклонён:**
```json
{
  "documentId": "msg-123-456",
  "status": "rejected",
  "messageId": "msg-123-456"
}
```

---

## Типы и Enums

### DiadocDocumentStatus

```typescript
enum DiadocDocumentStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  WAITING_FOR_RECIPIENT_SIGNATURE = 'waiting_for_recipient_signature',
  SIGNED = 'signed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}
```

### DiadocErrorCode

```typescript
enum DiadocErrorCode {
  UNKNOWN = 'UNKNOWN',
  AUTH_ERROR = 'AUTH_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_API_CLIENT_ID = 'INVALID_API_CLIENT_ID',
  BOX_NOT_FOUND = 'BOX_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  COUNTERPARTY_NOT_FOUND = 'COUNTERPARTY_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_DOCUMENT_FORMAT = 'INVALID_DOCUMENT_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  ALREADY_SIGNED = 'ALREADY_SIGNED',
  ALREADY_REJECTED = 'ALREADY_REJECTED',
}
```

---

## Коды ошибок

### Класс DiadocError

```typescript
class DiadocError extends Error {
  code: DiadocErrorCode;
  httpStatus?: number;
  retryable: boolean;
  retryAfter?: number;
  originalError?: Error;

  isTemporary(): boolean;
  getRetryDelay(): number;
}
```

### Обработка ошибок

```typescript
try {
  await diadocService.uploadDocument(buffer, 'file.pdf', 'application/pdf');
} catch (error) {
  if (error instanceof DiadocError) {
    console.log('Error code:', error.code);
    console.log('Retryable:', error.retryable);
    
    if (error.retryable) {
      const delay = error.getRetryDelay();
      console.log(`Retry after ${delay}ms`);
    }
  }
}
```

---

**Автор**: Специалист оператор + Ассистент [бот коммерческий]

**Интеллектуальные права** принадлежат ООО «Иннотек Лабс»
