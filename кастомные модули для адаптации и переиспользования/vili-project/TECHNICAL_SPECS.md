# Технические спецификации проекта Вили (VILI)

## Обзор

Данный документ содержит детальные технические спецификации для реализации проекта Вили.

**Дата создания:** 2025-01-27  
**Версия:** 1.0

---

## Технологический стек

### Backend

#### Язык программирования
- **Python 3.10+**
  - Обоснование: Широкая поддержка AI/ML библиотек, интеграция с FinGPT/FinRobot/FinRL
  - Версия: Python 3.10 или выше

#### Web Framework
- **FastAPI**
  - Обоснование: Высокая производительность, автоматическая документация API, async поддержка
  - Версия: FastAPI 0.104+

#### База данных
- **PostgreSQL 14+**
  - Обоснование: Надежность, поддержка JSON, транзакции
  - Использование: Основная БД для хранения документов, результатов анализа, метаданных

- **Redis 7+**
  - Обоснование: Кэширование, очереди, сессии
  - Использование: Кэширование результатов AI анализа, очереди задач

#### Message Queue
- **RabbitMQ** или **Apache Kafka**
  - Обоснование: Асинхронная обработка, масштабируемость
  - Использование: Очереди для обработки документов, уведомления

#### AI/ML Frameworks
- **PyTorch 2.0+**
  - Обоснование: Поддержка FinGPT, FinRobot, FinRL
  - Использование: Работа с моделями

- **Transformers (Hugging Face)**
  - Обоснование: Интеграция с FinGPT моделями
  - Версия: transformers 4.30+

- **FinGPT**
  - Модели: FinGPT v3.3 (Llama2-13B), Multi-task модели
  - Использование: Анализ документов, извлечение данных

- **FinRobot**
  - Версия: Последняя стабильная
  - Использование: Workflow агенты, Perception-Brain-Action

- **FinRL**
  - Версия: Последняя стабильная
  - Использование: Оценка рисков, оптимизация workflow

### Frontend (SDK)

#### Язык
- **TypeScript 5+**
  - Обоснование: Типобезопасность, лучшая поддержка IDE

#### Build Tool
- **Webpack** или **Rollup**
  - Обоснование: Сборка и минификация кода

#### UI Components
- **Custom Components**
  - Обоснование: Изолированные стили, независимость от фреймворков

### Infrastructure

#### Containerization
- **Docker**
  - Версия: Docker 20.10+
  - Использование: Контейнеризация приложений

#### Orchestration
- **Kubernetes** (для продакшена)
  - Версия: Kubernetes 1.28+
  - Использование: Оркестрация контейнеров, масштабирование

#### CI/CD
- **GitHub Actions** или **GitLab CI**
  - Использование: Автоматизация сборки и развертывания

#### Monitoring
- **Prometheus + Grafana**
  - Использование: Мониторинг метрик, визуализация

#### Logging
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
  - Использование: Централизованное логирование

---

## Архитектура данных

### Модель данных

#### Документы платежей

```python
class PaymentDocument:
    id: UUID
    type: str  # "traditional" | "crypto"
    format: str  # "SWIFT", "PDF", "JSON", "blockchain"
    raw_data: bytes
    parsed_data: dict
    status: str  # "pending", "processing", "completed", "failed"
    created_at: datetime
    updated_at: datetime
    operator_id: UUID
    customer_id: UUID  # ID заказчика (для multi-tenant)
```

#### Результаты анализа

```python
class AnalysisResult:
    id: UUID
    document_id: UUID
    analysis_type: str  # "document", "compliance", "risk"
    result_data: dict
    confidence_score: float
    model_version: str
    created_at: datetime
```

#### Compliance проверки

```python
class ComplianceCheck:
    id: UUID
    document_id: UUID
    check_type: str  # "sanctions", "kyc", "aml", "travel_rule"
    status: str  # "passed", "failed", "warning"
    details: dict
    created_at: datetime
```

#### Оценки рисков

```python
class RiskAssessment:
    id: UUID
    document_id: UUID
    risk_score: float  # 0.0 - 1.0
    risk_level: str  # "low", "medium", "high", "critical"
    factors: list[dict]
    economic_indices: dict  # Экономические индексы стран
    recommendation: str  # "approve", "reject", "review"
    created_at: datetime
```

#### Обратная связь

```python
class Feedback:
    id: UUID
    document_id: UUID
    operator_id: UUID
    feedback_type: str  # "correct", "incorrect", "improvement"
    feedback_data: dict
    created_at: datetime
```

#### Блокчейн транзакции (для крипто)

```python
class BlockchainTransaction:
    id: UUID
    tx_hash: str
    blockchain: str  # "ethereum", "bitcoin", etc.
    from_address: str
    to_address: str
    amount: Decimal
    currency: str
    block_number: int
    timestamp: datetime
    transaction_data: dict
    graph_data: dict  # Граф транзакций
```

#### Экономические индексы

```python
class EconomicIndex:
    id: UUID
    country_code: str
    index_type: str  # "economic_freedom", "corruption", "doing_business", etc.
    value: float
    year: int
    source: str
    updated_at: datetime
```

---

## API Спецификации

### REST API Endpoints

#### Документы

```
POST   /api/v1/documents              # Загрузка документа
GET    /api/v1/documents/{id}         # Получение документа
GET    /api/v1/documents               # Список документов
DELETE /api/v1/documents/{id}         # Удаление документа
```

#### Анализ

```
POST   /api/v1/documents/{id}/analyze # Запуск анализа
GET    /api/v1/documents/{id}/analysis # Получение результатов анализа
```

#### Compliance

```
GET    /api/v1/documents/{id}/compliance # Compliance проверки
POST   /api/v1/documents/{id}/compliance/check # Запуск проверки
```

#### Риски

```
GET    /api/v1/documents/{id}/risk     # Оценка рисков
POST   /api/v1/documents/{id}/risk/assess # Запуск оценки
```

#### Обратная связь

```
POST   /api/v1/documents/{id}/feedback # Отправка обратной связи
GET    /api/v1/documents/{id}/feedback # Получение обратной связи
```

#### Блокчейн (для крипто)

```
POST   /api/v1/blockchain/analyze      # Анализ блокчейн транзакции
GET    /api/v1/blockchain/transaction/{tx_hash} # Получение транзакции
POST   /api/v1/blockchain/trace        # Отслеживание адресов
```

#### Экономические индексы

```
GET    /api/v1/economic-indices/{country_code} # Получение индексов страны
GET    /api/v1/economic-indices/{country_code}/{index_type} # Конкретный индекс
```

### WebSocket Events

```
document.uploaded      # Документ загружен
document.processing    # Документ обрабатывается
document.completed     # Обработка завершена
document.failed        # Ошибка обработки
analysis.progress      # Прогресс анализа
risk.updated          # Обновление оценки риска
```

---

## Интеграции

### FinGPT Integration

#### Модели

- **FinGPT v3.3 (Llama2-13B)**
  - Использование: Анализ настроений, основной анализ
  - HuggingFace: `FinGPT/fingpt-sentiment_llama2-13b_lora`

- **Multi-task модели**
  - Использование: Комплексный анализ
  - HuggingFace: `FinGPT/fingpt-mt_llama2-7b_lora`

#### API

```python
from finrobot.agents.workflow import SingleAssistant
from finrobot.utils import register_keys_from_json

# Настройка FinGPT
llm_config = {
    "config_list": autogen.config_list_from_json("OAI_CONFIG_LIST"),
    "timeout": 120,
    "temperature": 0,
}

# Создание агента
agent = SingleAssistant("Document_Analyst", llm_config)
```

### FinRobot Integration

#### Workflow

```python
from finrobot.agents.workflow import SingleAssistant

# Perception-Brain-Action workflow
agent = SingleAssistant(
    "Payment_Processor",
    llm_config,
    human_input_mode="NEVER"
)

# Выполнение анализа
result = agent.chat("Analyze payment document...")
```

### FinRL Integration

#### Risk Assessment

```python
from finrl import DRLAgent
from finrl.meta.env_stock_trading import StockTradingEnv

# Создание среды для оценки рисков
env = RiskAssessmentEnv(
    df=transaction_data,
    initial_amount=1.0,
    transaction_cost_pct=0.001
)

# Создание агента
agent = DRLAgent(env=env)
```

### Blockchain APIs

#### Etherscan

```python
import requests

ETHERSCAN_API = "https://api.etherscan.io/api"
API_KEY = os.getenv("ETHERSCAN_API_KEY")

def get_transaction(tx_hash):
    params = {
        "module": "proxy",
        "action": "eth_getTransactionByHash",
        "txhash": tx_hash,
        "apikey": API_KEY
    }
    response = requests.get(ETHERSCAN_API, params=params)
    return response.json()
```

#### Blockchair

```python
BLOCKCHAIR_API = "https://api.blockchair.com"

def get_transaction(blockchain, tx_hash):
    url = f"{BLOCKCHAIR_API}/{blockchain}/dashboards/transaction/{tx_hash}"
    response = requests.get(url)
    return response.json()
```

### Economic Indices APIs

#### Интеграция с источниками индексов

```python
class EconomicIndicesClient:
    def __init__(self):
        self.sources = {
            'economic_freedom': 'https://www.heritage.org/index/api',
            'corruption': 'https://www.transparency.org/api',
            'doing_business': 'https://api.worldbank.org',
            'globalization': 'https://kof.ethz.ch/api'
        }
    
    def get_index(self, index_type, country_code, year=None):
        """Получение экономического индекса"""
        source_url = self.sources.get(index_type)
        if not source_url:
            raise ValueError(f"Unknown index type: {index_type}")
        
        # Запрос к API источника
        response = requests.get(source_url, params={
            'country': country_code,
            'year': year or datetime.now().year
        })
        return response.json()
```

---

## Безопасность

### Аутентификация

- **OAuth 2.0** с JWT токенами
- **API Keys** для внешних интеграций
- **Session Management** через Redis

### Авторизация

- **RBAC** (Role-Based Access Control)
- Роли: `admin`, `operator`, `compliance`, `viewer`
- Multi-tenant изоляция данных

### Шифрование

- **TLS/SSL** для передачи данных
- **AES-256** для данных в покое
- **Хеширование** паролей (bcrypt)

### Аудит

- Логирование всех действий
- Хранение логов аудита
- Отслеживание изменений данных

### CORS

- Управление cross-origin запросами
- Whitelist доменов заказчиков
- Настройка заголовков безопасности

---

## Производительность

### Требования

- **Время обработки документа:** < 30 секунд (базовый), < 2 минуты (расширенный)
- **Throughput:** > 100 документов/час
- **Latency API:** < 500ms (p95)
- **Uptime:** > 99.9%

### Оптимизация

- **Кэширование:** Redis для результатов анализа
- **Асинхронная обработка:** Celery или аналоги
- **Batch processing:** Обработка пакетов документов
- **CDN:** Для статических файлов SDK

---

## Мониторинг

### Метрики

- **Производительность:**
  - Время обработки документов
  - Throughput
  - Latency API
  - Ошибки обработки

- **Качество:**
  - Точность анализа
  - False positive/negative rate
  - User satisfaction

- **Система:**
  - CPU, память, диск
  - Сеть
  - База данных

### Логирование

- **Structured Logging:** JSON формат
- **Уровни:** DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Retention:** 90 дней для production

---

## Развертывание

### Development

```bash
# Локальная разработка
docker-compose up -d
python -m uvicorn app.main:app --reload
```

### Staging

- Kubernetes кластер
- Автоматическое развертывание из ветки `staging`
- Тестовые данные

### Production

- Kubernetes кластер с высокой доступностью
- Автоматическое развертывание из ветки `main`
- Мониторинг и алертинг
- Backup и disaster recovery

---

## Тестирование

### Unit Tests

- Покрытие: > 80% для критичных компонентов
- Framework: pytest
- Mocking: unittest.mock

### Integration Tests

- Тесты API endpoints
- Тесты интеграций с внешними системами
- Тесты базы данных

### End-to-End Tests

- Тесты полных workflow
- Тесты с реальными данными (anonymized)
- Performance тесты

---

## Документация

### API Documentation

- **OpenAPI/Swagger:** Автоматическая генерация из FastAPI
- **Примеры:** Для каждого endpoint
- **Схемы:** Детальные схемы данных

### Code Documentation

- **Docstrings:** Для всех функций и классов
- **Type Hints:** Для всех функций
- **README:** Для каждого модуля

---

## Версионирование

### API Versioning

- **Семантическое версионирование:** MAJOR.MINOR.PATCH
- **URL версионирование:** `/api/v1/`, `/api/v2/`
- **Backward compatibility:** Поддержка предыдущих версий

### Model Versioning

- Версионирование AI моделей
- Отслеживание версий моделей в результатах анализа
- Возможность отката к предыдущим версиям

### SDK Versioning

- Версионирование JavaScript SDK
- Совместимость версий
- Changelog для каждой версии

---

## Структура проекта

### Backend

```
vili-backend/
├── app/
│   ├── api/              # API endpoints
│   │   ├── v1/
│   │   │   ├── documents.py
│   │   │   ├── compliance.py
│   │   │   ├── risk.py
│   │   │   └── blockchain.py
│   ├── core/             # Ядро системы
│   │   ├── config.py
│   │   ├── security.py
│   │   └── dependencies.py
│   ├── agents/           # AI агенты (FinRobot)
│   │   ├── document_analysis.py
│   │   ├── compliance.py
│   │   └── risk_assessment.py
│   ├── models/           # AI модели (FinGPT, FinRL)
│   │   ├── fingpt_client.py
│   │   ├── finrl_agent.py
│   │   └── economic_indices.py
│   ├── services/         # Бизнес-логика
│   │   ├── document_processor.py
│   │   ├── compliance_engine.py
│   │   └── risk_assessment.py
│   ├── database/         # Модели БД
│   │   ├── models.py
│   │   └── schemas.py
│   └── utils/            # Утилиты
├── tests/
├── alembic/              # Миграции БД
├── requirements.txt
└── Dockerfile
```

### Frontend SDK

```
vili-sdk/
├── src/
│   ├── core/
│   │   ├── api-client.ts
│   │   ├── config.ts
│   │   └── events.ts
│   ├── ui/
│   │   ├── widget.ts
│   │   ├── chat.ts
│   │   └── results.ts
│   ├── components/
│   │   └── vili-assistant.ts  # Web Component
│   └── utils/
├── dist/
├── tests/
├── package.json
└── webpack.config.js
```

---

## Заключение

Данные технические спецификации обеспечивают:

- ✅ Четкое понимание технологий
- ✅ Детальные требования к реализации
- ✅ Стандарты кодирования и документации
- ✅ Требования к безопасности и производительности
- ✅ План развертывания и тестирования
- ✅ Структуру проекта

Спецификации могут быть адаптированы под конкретные требования проекта.
