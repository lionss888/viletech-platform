# Тесты интеграции с Диадоком (VF-2)

## Описание

Этот каталог содержит комплексный набор тестов для проверки функционала интеграции с Diadoc API для электронного документооборота.

## Структура тестов

### Unit-тесты сервисов

Расположение: `src/modules/diadoc/service/*.spec.ts`

- **diadoc.service.spec.ts** - тесты DiadocService
  - Аутентификация
  - Загрузка документов (uploadDocument)
  - Отправка на подписание (sendForSigning)
  - Получение статуса (getDocumentStatus)
  - Получение подписанного документа (getSignedDocument)
  - Обработка ошибок API (400, 401, 429, 500)
  - Retry механизмы
  - Проверка формата Authorization заголовка

- **diadoc-webhook-processor.service.spec.ts** - тесты обработчика webhook
  - Обработка событий подписания
  - Обработка событий отклонения
  - Обработка событий отмены
  - Идемпотентность обработки
  - Обработка ошибок

- **diadoc-status-checker.service.spec.ts** - тесты проверки статусов
  - Scheduled task
  - Проверка статусов документов
  - Retry логика
  - Обработка ошибок

### Unit-тесты связанных сервисов

- **form-payment-diadoc.service.spec.ts** - тесты методов Diadoc в FormPaymentService
- **contract-diadoc.service.spec.ts** - тесты методов Diadoc в ContractService

### Integration-тесты

Расположение: `test/integration/`

- **diadoc-config.spec.ts** - тесты конфигурации
  - Загрузка из переменных окружения
  - Значения по умолчанию
  - Валидация настроек

### E2E тесты

Расположение: `test/e2e/`

- **diadoc-form-payment-order.e2e-spec.ts** - полный flow поручения на оплату
- **diadoc-contract.e2e-spec.ts** - полный flow договора
- **diadoc-errors.e2e-spec.ts** - тесты обработки ошибок

### Compliance тесты

Расположение: `test/compliance/`

- **diadoc-api-compliance.spec.ts** - общая проверка соответствия документации API Диадока
  - Формат авторизации
  - Endpoints
  - Структура ответов
  - Маппинг статусов

- **diadoc-auth-compliance.spec.ts** - тесты формата авторизации
  - DiadocAuth формат заголовка
  - Параметры api_key и ddauth_api_client_id
  - Обработка ошибок авторизации (401)

- **diadoc-endpoints-compliance.spec.ts** - тесты соответствия endpoints
  - /V3/PostMessage для загрузки документов
  - /V3/SendMessage для отправки на подписание
  - /V3/GetMessage для получения статуса
  - /V3/GetMessageContent для получения подписанного документа
  - HTTP методы и параметры запросов

- **diadoc-response-structure.spec.ts** - тесты структуры ответов
  - PostMessage response (MessageId)
  - GetMessage response (Status)
  - GetMessageContent response (binary)
  - Обработка вложенных структур

- **diadoc-rate-limiting.spec.ts** - тесты rate limiting
  - Обработка 429 Too Many Requests
  - Retry-After заголовок
  - Exponential backoff
  - Graceful degradation

- **diadoc-webhook-structure.spec.ts** - тесты структуры webhook
  - Обязательные поля (documentId, status)
  - Опциональные поля (messageId, timestamp)
  - Валидация payload

- **diadoc-api-versioning.spec.ts** - тесты версионирования API
  - Использование V3 версии
  - Проверка deprecated версий (V1, V2)
  - Миграция версий

- **diadoc-api-errors.spec.ts** - тесты обработки ошибок API
  - HTTP статус коды (400, 401, 403, 404, 429, 5xx)
  - Специфичные коды ошибок Diadoc
  - Классификация ошибок

- **diadoc-implementation-validation.spec.ts** - валидация реализации
  - Соответствие реализованных методов документации
  - Workflow compliance
  - Конфигурация

## Запуск тестов

### Все тесты Diadoc

```bash
npm run test -- --testPathPattern=diadoc
```

### Unit-тесты

```bash
npm run test -- --testPathPattern="src/modules/diadoc"
```

### Integration-тесты

```bash
npm run test -- --testPathPattern="test/integration"
```

### E2E тесты

```bash
npm run test -- --testPathPattern="test/e2e"
```

### Compliance тесты

```bash
npm run test -- --testPathPattern="test/compliance"
```

### С покрытием кода

```bash
npm run test:cov -- --testPathPattern=diadoc
```

## Тестовые данные

### Моки

Для тестирования используются следующие моки:

- **mockDiadocService** - мок сервиса Diadoc
- **mockFileService** - мок файлового сервиса
- **mockFormPaymentService** - мок сервиса заявок
- **mockContractService** - мок сервиса договоров
- **mockConfigService** - мок конфигурации

### Тестовые ID

```typescript
const mockDocumentId = 'diadoc-document-id-123';
const mockMessageId = 'diadoc-message-id-456';
const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
const mockContractId = new mongoose.Types.ObjectId().toString();
```

### Конфигурация для тестов

```typescript
const testConfig = {
  diadoc: {
    enabled: true,
    apiUrl: 'https://diadoc-api.kontur.ru',
    apiKey: 'test-api-key',
    boxId: 'test-box-id',
  },
};
```

## Требования к покрытию

| Компонент | Минимальное покрытие |
|-----------|---------------------|
| DiadocService | 90% |
| DiadocWebhookProcessorService | 90% |
| DiadocStatusCheckerService | 85% |
| DiadocController | 85% |
| FormPaymentService (Diadoc методы) | 90% |
| ContractService (Diadoc методы) | 90% |

## Паттерны тестирования

### AAA (Arrange-Act-Assert)

```typescript
it('should upload document successfully', async () => {
  // Arrange
  const buffer = Buffer.from('test content');
  mockHttpService.post.mockReturnValueOnce(of({ data: { MessageId: 'id' } }));

  // Act
  const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

  // Assert
  expect(result).toBe('id');
});
```

### Идемпотентность

```typescript
it('should be idempotent for signed events', async () => {
  // Повторный вызов не должен изменять состояние
  await service.processWebhook(payload);
  await service.processWebhook(payload);
  
  expect(updateMock).toHaveBeenCalledTimes(1);
});
```

## Известные ограничения

1. E2E тесты используют моки, а не реальный API Diadoc
2. Нагрузочные тесты требуют отдельного запуска
3. Тесты с реальным API Diadoc требуют тестового окружения

## Переменные окружения для тестирования

```bash
# Для тестирования с реальным API (опционально)
DIADOC_ENABLED=true
DIADOC_API_URL=https://diadoc-api-test.kontur.ru
DIADOC_API_KEY=your-test-api-key
DIADOC_BOX_ID=your-test-box-id
```

## Документация API Диадока

Официальная документация: https://developer.kontur.ru/docs/diadoc-api/index.html

### Ключевые разделы:
- Авторизация
- Порядок документооборота
- Каталог методов
- Список структур

## Автор

Специалист оператор + Ассистент [бот коммерческий]
Интеллектуальные права принадлежат ООО «Иннотек Лабс»
