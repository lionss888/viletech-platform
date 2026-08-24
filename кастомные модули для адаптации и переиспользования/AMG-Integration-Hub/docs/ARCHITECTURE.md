# Архитектура AMG Integration Bus

## Принципы архитектуры

1. **Разделение ответственности**: Go (ядро), Python (аналитика), Vue (рендер)
2. **Backend-Driven UI**: Frontend получает JSON-схемы от backend
3. **Микросервисная архитектура**: Независимые сервисы с четкими границами
4. **Event-Driven**: Асинхронная обработка через шину событий
5. **Plugin Architecture**: Расширяемая система интеграций

## Диаграмма архитектуры

```mermaid
graph TB
    subgraph "Frontend Layer (BDUI)"
        UI[Vue 3 Frontend]
        Components[Dynamic Components]
        Schemas[JSON Schemas]
        
        UI --> Components
        Components --> Schemas
    end
    
    subgraph "API Gateway"
        Gateway[NGINX/Envoy]
        Auth[Authentication]
        RateLimit[Rate Limiting]
        
        Gateway --> Auth
        Gateway --> RateLimit
    end
    
    subgraph "Go Backend (Core)"
        Router[HTTP Router]
        Handlers[HTTP Handlers]
        Services[Business Services]
        IntegrationHub[Integration Hub]
        Domain[Domain Models]
        Repo[Repositories]
        
        Router --> Handlers
        Handlers --> Services
        Services --> IntegrationHub
        Services --> Domain
        Services --> Repo
    end
    
    subgraph "Integration Plugins"
        StrigaPlugin[Striga Plugin]
        RailsrPlugin[Railsr Plugin]
        StripePlugin[Stripe Plugin]
        SalesforcePlugin[Salesforce Plugin]
        
        IntegrationHub --> StrigaPlugin
        IntegrationHub --> RailsrPlugin
        IntegrationHub --> StripePlugin
        IntegrationHub --> SalesforcePlugin
    end
    
    subgraph "Python Analytics"
        FastAPI[FastAPI Server]
        ML[ML Models]
        Analytics[Analytics Engine]
        IntegrationAnalytics[Integration Analytics]
        AI[AI Services]
        
        FastAPI --> ML
        FastAPI --> Analytics
        FastAPI --> IntegrationAnalytics
        FastAPI --> AI
    end
    
    subgraph "External Services"
        StrigaAPI[Striga Banking API]
        RailsrAPI[Railsr API]
        StripeAPI[Stripe API]
        SalesforceAPI[Salesforce API]
        Database[(PostgreSQL)]
        Redis[(Redis Cache)]
        Queue[Message Queue]
    end
    
    subgraph "Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Logs[Centralized Logging]
        Alerts[Alert Manager]
    end
    
    %% Connections
    UI -.->|HTTP/WebSocket| Gateway
    Gateway --> Router
    Services -.->|HTTP/gRPC| FastAPI
    StrigaPlugin -.->|HMAC Auth| StrigaAPI
    RailsrPlugin -.->|Bearer Token| RailsrAPI
    StripePlugin -.->|API Key| StripeAPI
    SalesforcePlugin -.->|OAuth 2.0| SalesforceAPI
    Services --> Database
    Services --> Redis
    Services --> Queue
    FastAPI --> Database
    FastAPI --> Queue
    
    %% Monitoring
    Router --> Prometheus
    FastAPI --> Prometheus
    IntegrationHub --> Prometheus
    Prometheus --> Grafana
    Prometheus --> Alerts
    Router --> Logs
    FastAPI --> Logs
    IntegrationHub --> Logs
```

## Компоненты системы

### 1. Go Backend (Ядро)

**Ответственность**: Бизнес-логика, валидация, управление состоянием, управление интеграциями

**Структура**:
- `transport/http` - HTTP обработчики
- `service` - Бизнес-логика
- `integration` - Модули интеграций
- `domain` - Доменные модели
- `data-access` - Репозитории

**Принципы**:
- Тонкие контроллеры
- Вся логика в сервисах
- Строгая типизация
- Централизованная обработка ошибок
- Plugin архитектура для интеграций

### 2. Integration Hub

**Ответственность**: Централизованное управление всеми интеграциями

**Функции**:
- Регистрация и управление плагинами
- Маршрутизация запросов к интеграциям
- Мониторинг состояния интеграций
- Кэширование результатов
- Обработка ошибок и retry логика

**Plugin Interface**:
```go
type IntegrationPlugin interface {
    Name() string
    Version() string
    Initialize(config map[string]interface{}) error
    Execute(action string, params map[string]interface{}) (interface{}, error)
    HealthCheck() error
    GetMetrics() map[string]interface{}
}
```

### 3. Python Analytics

**Ответственность**: Аналитика, ML, AI-интеграции, мониторинг интеграций

**Структура**:
- `app/api` - FastAPI endpoints
- `services` - Аналитические сервисы
- `integrations` - Аналитика интеграций
- `models` - ML модели
- `utils` - Утилиты

**Принципы**:
- Только аналитические задачи
- Pydantic для валидации
- Асинхронная обработка
- Изоляция от бизнес-логики
- Специализация на аналитике интеграций

### 4. Vue Frontend (BDUI)

**Ответственность**: Рендер UI по схемам от backend

**Структура**:
- `components` - Динамические компоненты
- `views` - Страницы приложения
- `stores` - Pinia stores для состояния
- `services` - API клиенты
- `types` - TypeScript типы

**Принципы**:
- Нет бизнес-логики
- Динамический рендер
- Универсальные компоненты
- Легкое тестирование
- Реактивность через Pinia

## Поток данных

### 1. Создание интеграции

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant G as Go Backend
    participant IH as Integration Hub
    participant P as Plugin
    participant E as External API
    participant A as Analytics
    
    U->>F: Создать интеграцию
    F->>G: POST /api/v1/integrations
    G->>IH: RegisterPlugin()
    IH->>P: Initialize()
    P->>E: Test Connection
    E-->>P: Connection OK
    P-->>IH: Plugin Ready
    IH-->>G: Integration Created
    G->>A: Event: integration.created
    A-->>G: Analytics Data
    G-->>F: JSON Response + UI Schema
    F-->>U: Success/Error
```

### 2. Выполнение операции интеграции

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G as Go Backend
    participant IH as Integration Hub
    participant P as Plugin
    participant E as External API
    participant A as Analytics
    
    F->>G: POST /api/v1/integrations/:id/execute
    G->>IH: ExecuteAction()
    IH->>P: Execute()
    P->>E: API Call
    E-->>P: Response
    P-->>IH: Result
    IH-->>G: Operation Result
    G->>A: Event: integration.operation
    A-->>G: Analytics Data
    G-->>F: JSON Response + UI Schema
```

### 3. Мониторинг и аналитика

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G as Go Backend
    participant A as Python Analytics
    participant DB as Database
    
    F->>G: GET /api/v1/analytics/integrations
    G->>A: gRPC: GetIntegrationAnalytics
    A->>DB: Query Analytics Data
    DB-->>A: Analytics Results
    A->>A: ML Processing
    A-->>G: Analytics Response
    G-->>F: JSON + UI Schema
```

## Безопасность

### 1. Аутентификация
- **Внутренние API**: JWT токены
- **Внешние интеграции**: OAuth 2.0, API ключи, HMAC
- **Frontend**: HTTP-only cookies

### 2. Авторизация
- RBAC (Role-Based Access Control)
- Middleware для проверки прав
- Контекстные разрешения для интеграций

### 3. Валидация
- Pydantic для Python
- Struct tags для Go
- JSON Schema для Frontend
- Валидация конфигураций интеграций

### 4. Шифрование
- TLS для всех соединений
- Шифрование чувствительных данных в БД
- Ротация API ключей

## Масштабируемость

### 1. Горизонтальное масштабирование
- Stateless сервисы
- Load balancing
- Database sharding
- Plugin изоляция

### 2. Кэширование
- Redis для сессий и кэша
- Application-level кэш
- CDN для статики
- Кэширование результатов интеграций

### 3. Асинхронная обработка
- Message queues для интеграций
- Event sourcing
- CQRS pattern
- Retry механизмы

## Мониторинг

### 1. Метрики
- Prometheus для сбора метрик
- Grafana для визуализации
- Custom dashboards для интеграций
- Метрики производительности плагинов

### 2. Логирование
- Structured logging (JSON)
- Centralized collection
- Log aggregation
- Корреляция логов интеграций

### 3. Трейсинг
- Distributed tracing
- Request correlation
- Performance monitoring
- Интеграционный мониторинг

### 4. Алерты
- Health checks для всех интеграций
- Алерты при ошибках
- SLA мониторинг
- Автоматическое восстановление

## Развертывание

### 1. Docker
- Multi-stage builds
- Health checks
- Resource limits
- Plugin контейнеры

### 2. Kubernetes
- Helm charts
- ConfigMaps/Secrets
- Auto-scaling
- Plugin deployment

### 3. CI/CD
- GitOps workflow
- Automated testing
- Blue-green deployment
- Plugin versioning

## Планы развития

### Краткосрочные (1-3 месяца)
1. Базовая архитектура и core функциональность
2. Интеграция с Striga и Railsr
3. Мониторинг и логирование
4. Базовые тесты

### Среднесрочные (3-6 месяцев)
1. Дополнительные интеграции (Stripe, Salesforce)
2. ML аналитика интеграций
3. Автоматическое масштабирование
4. Расширенный мониторинг

### Долгосрочные (6+ месяцев)
1. Marketplace плагинов
2. AI-powered оптимизация интеграций
3. Multi-tenant архитектура
4. Глобальное развертывание
