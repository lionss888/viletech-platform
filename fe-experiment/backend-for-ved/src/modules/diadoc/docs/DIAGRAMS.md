# Диаграммы модуля Diadoc

## Содержание

- [Sequence Diagrams](#sequence-diagrams)
  - [Отправка поручения на оплату](#отправка-поручения-на-оплату)
  - [Отправка отчёта](#отправка-отчёта)
  - [Отправка договора](#отправка-договора)
  - [Обработка Webhook](#обработка-webhook)
  - [Периодическая проверка статусов](#периодическая-проверка-статусов)
- [Component Diagram](#component-diagram)
- [State Diagram](#state-diagram)

---

## Sequence Diagrams

### Отправка поручения на оплату

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant FormPaymentController
    participant FormPaymentService
    participant DiadocService
    participant DiadocAPI as Diadoc API
    participant MongoDB

    Client->>FormPaymentController: POST /form-payments/:id/sign-diadoc
    FormPaymentController->>FormPaymentService: signPaymentOrderViaDiadoc(id, recipientInn)
    
    FormPaymentService->>MongoDB: findOne(id)
    MongoDB-->>FormPaymentService: formPayment
    
    FormPaymentService->>FormPaymentService: Validate document exists
    
    FormPaymentService->>DiadocService: getBoxIdByInn(recipientInn)
    DiadocService->>DiadocAPI: GET /GetOrganizationsByInnKpp
    DiadocAPI-->>DiadocService: organizations[]
    DiadocService-->>FormPaymentService: recipientBoxId
    
    FormPaymentService->>DiadocService: uploadDocument(buffer, fileName, mimeType, recipientBoxId)
    DiadocService->>DiadocAPI: POST /V3/PostMessage
    DiadocAPI-->>DiadocService: messageId, entityId
    DiadocService-->>FormPaymentService: uploadResult
    
    FormPaymentService->>MongoDB: updateOne(docs.paymentOrderDiadocDocumentId)
    MongoDB-->>FormPaymentService: updated
    
    FormPaymentService->>DiadocService: recordDocumentSent("paymentOrder")
    
    FormPaymentService-->>FormPaymentController: updatedFormPayment
    FormPaymentController-->>Client: 200 OK
```

### Отправка отчёта

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant FormPaymentController
    participant FormPaymentService
    participant DiadocService
    participant DiadocAPI as Diadoc API
    participant MongoDB

    Client->>FormPaymentController: POST /form-payments/:id/sign-report-diadoc
    FormPaymentController->>FormPaymentService: signReportViaDiadoc(id, recipientInn)
    
    FormPaymentService->>MongoDB: findOne(id)
    MongoDB-->>FormPaymentService: formPayment
    
    FormPaymentService->>FormPaymentService: Validate report exists
    
    FormPaymentService->>DiadocService: getBoxIdByInn(recipientInn)
    DiadocService-->>FormPaymentService: recipientBoxId (from cache or API)
    
    FormPaymentService->>DiadocService: uploadDocument(buffer, fileName, mimeType, recipientBoxId)
    DiadocService->>DiadocAPI: POST /V3/PostMessage
    DiadocAPI-->>DiadocService: messageId, entityId
    
    FormPaymentService->>MongoDB: updateOne(docs.reportDiadocDocumentId)
    
    FormPaymentService->>DiadocService: recordDocumentSent("report")
    
    FormPaymentService-->>FormPaymentController: updatedFormPayment
    FormPaymentController-->>Client: 200 OK
```

### Отправка договора

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant ContractController
    participant ContractService
    participant DiadocService
    participant DiadocAPI as Diadoc API
    participant MongoDB

    Client->>ContractController: POST /contracts/:id/sign-diadoc
    ContractController->>ContractService: signContractViaDiadoc(id, recipientInn)
    
    ContractService->>MongoDB: findOne(id)
    MongoDB-->>ContractService: contract
    
    ContractService->>ContractService: Validate contract file exists
    
    ContractService->>DiadocService: getBoxIdByInn(recipientInn)
    DiadocService-->>ContractService: recipientBoxId
    
    ContractService->>DiadocService: uploadDocument(buffer, fileName, mimeType, recipientBoxId)
    DiadocService->>DiadocAPI: POST /V3/PostMessage
    DiadocAPI-->>DiadocService: messageId, entityId
    
    ContractService->>MongoDB: updateOne(diadocDocumentId, signatureType)
    
    ContractService->>DiadocService: recordDocumentSent("contract")
    
    ContractService-->>ContractController: updatedContract
    ContractController-->>Client: 200 OK
```

### Обработка Webhook

```mermaid
sequenceDiagram
    autonumber
    participant DiadocAPI as Diadoc API
    participant DiadocController
    participant WebhookProcessor
    participant FormPaymentService
    participant DiadocService
    participant FileService
    participant MongoDB

    DiadocAPI->>DiadocController: POST /diadoc/webhook
    Note over DiadocController: payload: documentId, status
    
    DiadocController->>FormPaymentService: findOneByPaymentOrderDiadocDocumentId(documentId)
    
    alt Found in FormPayment (Payment Order)
        FormPaymentService-->>DiadocController: formPayment
        DiadocController->>WebhookProcessor: processFormPaymentPaymentOrderStatusChange()
        
        alt status == SIGNED
            WebhookProcessor->>WebhookProcessor: Check idempotency
            WebhookProcessor->>DiadocService: getSignedDocument(documentId)
            DiadocService->>DiadocAPI: GET /V4/GetEntityContent
            DiadocAPI-->>DiadocService: signedDocumentBuffer
            DiadocService-->>WebhookProcessor: buffer
            
            WebhookProcessor->>FileService: baseUpload(buffer)
            FileService-->>WebhookProcessor: signedFile
            
            WebhookProcessor->>FormPaymentService: updateOne(paymentOrderSigned, status)
            FormPaymentService->>MongoDB: update
            
            WebhookProcessor->>DiadocService: recordDocumentSigned()
        else status == REJECTED
            WebhookProcessor->>FormPaymentService: updateOne(status: WAITING_CORRECTIONS)
            WebhookProcessor->>DiadocService: recordDocumentRejected()
        end
        
        WebhookProcessor-->>DiadocController: success
    else Not found
        DiadocController->>FormPaymentService: findOneByReportDiadocDocumentId(documentId)
        Note over DiadocController: Similar flow for Report...
    end
    
    DiadocController-->>DiadocAPI: 200 OK
```

### Периодическая проверка статусов

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Cron Scheduler
    participant StatusChecker as DiadocStatusCheckerService
    participant MongoDB
    participant DiadocService
    participant DiadocAPI as Diadoc API
    participant WebhookProcessor

    Cron->>StatusChecker: checkDiadocDocumentStatuses() [every 5 min]
    
    StatusChecker->>MongoDB: find(pending payment orders)
    MongoDB-->>StatusChecker: formPayments[]
    
    loop Process in batches
        StatusChecker->>StatusChecker: Check cache
        
        alt Cache hit
            StatusChecker->>StatusChecker: Use cached status
        else Cache miss
            StatusChecker->>DiadocService: getDocumentStatus(messageId)
            DiadocService->>DiadocAPI: GET /V6/GetMessage
            DiadocAPI-->>DiadocService: status
            DiadocService-->>StatusChecker: status
            StatusChecker->>StatusChecker: Update cache
        end
        
        alt Terminal status (SIGNED/REJECTED/CANCELLED)
            StatusChecker->>WebhookProcessor: processFormPaymentPaymentOrderStatusChange()
            Note over WebhookProcessor: Same flow as webhook
        end
    end
    
    StatusChecker->>StatusChecker: Cleanup expired cache entries
    StatusChecker->>StatusChecker: Log statistics
```

---

## Component Diagram

```mermaid
graph TB
    subgraph external [External Systems]
        DiadocAPI[Diadoc API<br/>Kontur]
        Client[Client Application]
    end
    
    subgraph feaapi [FEA API]
        subgraph diadoc_module [DiadocModule]
            DiadocController[DiadocController<br/>HTTP Endpoints]
            DiadocService[DiadocService<br/>API Integration]
            WebhookProcessor[WebhookProcessor<br/>Status Changes]
            StatusChecker[StatusChecker<br/>Cron Job]
            MetricsService[MetricsService<br/>Monitoring]
            ErrorHandler[ErrorHandler<br/>Error Classification]
        end
        
        subgraph form_payment [FormPaymentModule]
            FormPaymentService[FormPaymentService]
            FormPaymentSchema[(FormPayment)]
        end
        
        subgraph contract [ContractModule]
            ContractService[ContractService]
            ContractSchema[(Contract)]
        end
        
        subgraph file [FileModule]
            FileService[FileService]
            FileStorage[(S3/MinIO)]
        end
    end
    
    Client -->|HTTP| DiadocController
    DiadocAPI -->|Webhook| DiadocController
    
    DiadocController --> WebhookProcessor
    DiadocController --> DiadocService
    DiadocController --> MetricsService
    
    DiadocService -->|HTTP| DiadocAPI
    DiadocService --> ErrorHandler
    DiadocService --> MetricsService
    
    WebhookProcessor --> DiadocService
    WebhookProcessor --> FormPaymentService
    WebhookProcessor --> ContractService
    WebhookProcessor --> FileService
    
    StatusChecker --> DiadocService
    StatusChecker --> WebhookProcessor
    StatusChecker --> FormPaymentSchema
    StatusChecker --> ContractSchema
    
    FormPaymentService --> DiadocService
    FormPaymentService --> FormPaymentSchema
    
    ContractService --> DiadocService
    ContractService --> ContractSchema
    
    FileService --> FileStorage
```

---

## State Diagram

### Статусы документа в Diadoc

```mermaid
stateDiagram-v2
    [*] --> Draft: Создание документа
    
    Draft --> Sent: uploadDocument()
    
    Sent --> WaitingForSignature: Документ доставлен
    
    WaitingForSignature --> Signed: Контрагент подписал
    WaitingForSignature --> Rejected: Контрагент отклонил
    WaitingForSignature --> Cancelled: Отмена отправителем
    WaitingForSignature --> Error: Ошибка обработки
    
    Signed --> [*]: Документооборот завершён
    Rejected --> [*]: Документооборот завершён
    Cancelled --> [*]: Документооборот завершён
    Error --> WaitingForSignature: Повторная попытка

    state Signed {
        [*] --> DownloadingSignedDoc
        DownloadingSignedDoc --> SavingToFile
        SavingToFile --> UpdatingStatus
        UpdatingStatus --> [*]
    }
    
    state Rejected {
        [*] --> UpdatingStatusRejected
        UpdatingStatusRejected --> NotifyingUser
        NotifyingUser --> [*]
    }
```

### Статусы FormPayment при работе с Diadoc

```mermaid
stateDiagram-v2
    [*] --> DOCUMENT_READY: Поручение сгенерировано
    
    DOCUMENT_READY --> SIGNING_ORDER: signPaymentOrderViaDiadoc()
    
    SIGNING_ORDER --> SIGNING_ORDER_WAITING_VERIFICATION: Подписано (webhook/check)
    SIGNING_ORDER --> SIGNING_ORDER_WAITING_CORRECTIONS: Отклонено (webhook/check)
    
    SIGNING_ORDER_WAITING_VERIFICATION --> PAYMENT_READY: Верификация пройдена
    
    SIGNING_ORDER_WAITING_CORRECTIONS --> SIGNING_ORDER: Исправлено и отправлено повторно
    
    PAYMENT_READY --> [*]
```

### Статусы Contract при работе с Diadoc

```mermaid
stateDiagram-v2
    [*] --> PENDING: Договор создан
    
    PENDING --> WAITING_SIGNATURE: signContractViaDiadoc()
    
    WAITING_SIGNATURE --> ACCEPTED: Подписано (webhook/check)
    WAITING_SIGNATURE --> REJECTED: Отклонено (webhook/check)
    
    ACCEPTED --> [*]: Договор действует
    
    REJECTED --> PENDING: Создан новый договор
    REJECTED --> [*]: Договор отменён
```

---

## Диаграмма обработки ошибок

```mermaid
flowchart TD
    A[HTTP Request to Diadoc] --> B{Response}
    
    B -->|2xx Success| C[Return Result]
    
    B -->|401 Unauthorized| D[Clear Token Cache]
    D --> E[Retry with New Token]
    E --> B
    
    B -->|429 Too Many Requests| F[Parse Retry-After]
    F --> G[Wait delay]
    G --> H{Attempts < Max?}
    H -->|Yes| A
    H -->|No| I[Throw RateLimitError]
    
    B -->|5xx Server Error| J{Retryable?}
    J -->|Yes| K[Calculate Exponential Backoff]
    K --> L[Wait delay]
    L --> H
    J -->|No| M[Throw ServiceUnavailableError]
    
    B -->|4xx Client Error| N[Classify Error]
    N --> O[Throw DiadocError]
    
    B -->|Timeout| P[Record Timeout Metric]
    P --> H
    
    B -->|Network Error| Q[Record Network Error Metric]
    Q --> H
```

---

**Автор**: Специалист оператор + Ассистент [бот коммерческий]

**Интеллектуальные права** принадлежат ООО «Иннотек Лабс»
