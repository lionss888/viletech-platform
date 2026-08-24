# Структура проекта Вили (VILI)

## Обзор

Данный документ описывает структуру проекта и организацию файлов.

**Дата создания:** 2025-01-27  
**Версия:** 1.0

---

## Корневая структура

```
vili-project/
├── app/                          # Backend приложение
├── sdk/                          # JavaScript SDK
├── docs/                         # Документация
├── tests/                        # Тесты
├── docker/                       # Docker конфигурации
├── scripts/                      # Вспомогательные скрипты
├── ARCHITECTURE.md               # Архитектура системы
├── REQUIREMENTS.md               # Требования
├── INTEGRATION.md                # Руководство по интеграции
├── IMPLEMENTATION_PLAN.md        # План реализации
├── TECHNICAL_SPECS.md            # Технические спецификации
├── PROJECT_STRUCTURE.md          # Этот файл
├── NEIMING.md                    # Нейминг проекта
├── README.md                     # Описание проекта
├── requirements.txt              # Python зависимости
├── docker-compose.yml            # Docker Compose конфигурация
├── .env.example                  # Пример переменных окружения
├── .gitignore                    # Git ignore правила
└── pyproject.toml               # Python проект конфигурация
```

---

## Backend (app/)

```
app/
├── __init__.py
├── main.py                       # Точка входа приложения
├── config.py                     # Конфигурация приложения
│
├── api/                          # API endpoints
│   ├── __init__.py
│   ├── deps.py                   # Зависимости API
│   └── v1/
│       ├── __init__.py
│       ├── documents.py          # Endpoints для документов
│       ├── compliance.py         # Endpoints для compliance
│       ├── risk.py               # Endpoints для рисков
│       ├── blockchain.py         # Endpoints для блокчейна
│       ├── feedback.py           # Endpoints для обратной связи
│       └── economic_indices.py   # Endpoints для экономических индексов
│
├── core/                         # Ядро системы
│   ├── __init__.py
│   ├── config.py                 # Настройки
│   ├── security.py               # Безопасность
│   ├── dependencies.py           # Зависимости
│   └── exceptions.py             # Исключения
│
├── agents/                       # AI агенты (FinRobot)
│   ├── __init__.py
│   ├── base.py                   # Базовый класс агента
│   ├── document_analysis.py      # Агент анализа документов
│   ├── compliance.py             # Compliance агент
│   ├── risk_assessment.py       # Агент оценки рисков
│   ├── blockchain_analysis.py   # Агент анализа блокчейна
│   └── scheduler.py              # Smart Scheduler
│
├── models/                       # AI модели (FinGPT, FinRL)
│   ├── __init__.py
│   ├── fingpt_client.py         # Клиент FinGPT
│   ├── finrl_agent.py           # FinRL агент
│   ├── economic_indices.py      # Экономические индексы
│   └── adapters.py              # Адаптеры моделей
│
├── services/                     # Бизнес-логика
│   ├── __init__.py
│   ├── document_processor.py    # Обработка документов
│   ├── compliance_engine.py    # Compliance движок
│   ├── risk_assessment.py      # Оценка рисков
│   ├── report_generator.py     # Генерация отчетов
│   ├── adaptive_learning.py    # Адаптивное обучение
│   └── blockchain_parser.py    # Парсинг блокчейна
│
├── database/                     # База данных
│   ├── __init__.py
│   ├── base.py                  # Базовый класс
│   ├── models.py                # SQLAlchemy модели
│   ├── schemas.py               # Pydantic схемы
│   └── crud.py                  # CRUD операции
│
├── integrations/                 # Интеграции
│   ├── __init__.py
│   ├── blockchain/              # Блокчейн интеграции
│   │   ├── etherscan.py
│   │   ├── blockchair.py
│   │   └── base.py
│   ├── compliance/              # Compliance источники
│   │   ├── sanctions.py
│   │   └── regulatory.py
│   └── economic/                # Экономические источники
│       ├── heritage.py
│       ├── transparency.py
│       └── worldbank.py
│
├── plugins/                      # Опциональные плагины
│   ├── __init__.py
│   ├── deepecon.py             # DeepEcon.ai модуль
│   └── stata_mcp.py            # Stata MCP модуль
│
└── utils/                        # Утилиты
    ├── __init__.py
    ├── helpers.py
    ├── validators.py
    └── formatters.py
```

---

## SDK (sdk/)

```
sdk/
├── src/
│   ├── index.ts                 # Точка входа
│   ├── core/
│   │   ├── api-client.ts       # API клиент
│   │   ├── config.ts           # Конфигурация
│   │   └── events.ts           # Event system
│   ├── ui/
│   │   ├── widget.ts           # Widget компонент
│   │   ├── chat.ts             # Chat интерфейс
│   │   └── results.ts          # Отображение результатов
│   ├── components/
│   │   └── vili-assistant.ts   # Web Component
│   └── utils/
│       ├── helpers.ts
│       └── validators.ts
├── dist/                        # Собранные файлы
├── tests/
├── package.json
├── tsconfig.json
└── webpack.config.js
```

---

## Документация (docs/)

```
docs/
├── api/                         # API документация
├── integration/                 # Примеры интеграции
├── user-guide/                  # Руководство пользователя
└── development/                 # Документация для разработчиков
```

---

## Тесты (tests/)

```
tests/
├── unit/                        # Unit тесты
│   ├── test_document_processor.py
│   ├── test_compliance_engine.py
│   └── test_risk_assessment.py
├── integration/                 # Integration тесты
│   ├── test_api_endpoints.py
│   └── test_integrations.py
├── e2e/                         # End-to-end тесты
│   └── test_workflows.py
└── fixtures/                    # Тестовые данные
    ├── documents/
    └── blockchain/
```

---

## Docker (docker/)

```
docker/
├── Dockerfile                   # Backend Dockerfile
├── Dockerfile.sdk               # SDK Dockerfile
└── nginx.conf                   # Nginx конфигурация
```

---

## Скрипты (scripts/)

```
scripts/
├── setup.sh                     # Настройка окружения
├── migrate.sh                   # Миграции БД
├── test.sh                      # Запуск тестов
└── deploy.sh                    # Развертывание
```

---

## Конфигурационные файлы

### Backend

- `app/config.py` - Конфигурация приложения
- `alembic.ini` - Конфигурация миграций
- `.env` - Переменные окружения

### SDK

- `sdk/package.json` - NPM зависимости
- `sdk/tsconfig.json` - TypeScript конфигурация
- `sdk/webpack.config.js` - Webpack конфигурация

---

## База данных

### Миграции

```
alembic/
├── versions/                    # Версии миграций
└── env.py                      # Конфигурация Alembic
```

### Схема БД

Основные таблицы:
- `documents` - Документы платежей
- `analysis_results` - Результаты анализа
- `compliance_checks` - Compliance проверки
- `risk_assessments` - Оценки рисков
- `feedback` - Обратная связь
- `blockchain_transactions` - Блокчейн транзакции
- `economic_indices` - Экономические индексы

---

## Логи и мониторинг

```
logs/
├── app.log                      # Логи приложения
├── api.log                      # Логи API
└── errors.log                   # Логи ошибок
```

---

## Заключение

Данная структура обеспечивает:

- ✅ Четкую организацию кода
- ✅ Разделение ответственности
- ✅ Масштабируемость
- ✅ Легкость поддержки
- ✅ Модульность

Структура может быть адаптирована под конкретные требования проекта.
