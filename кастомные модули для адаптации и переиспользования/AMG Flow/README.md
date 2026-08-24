# AMG Flow - Система автоматизации бизнес-процессов

**Версия:** 1.0  
**Дата передачи:** 1 января 2025  
**Статус:** Готово к передаче

## 🚀 Быстрый старт

```bash
# 1. Установка зависимостей
make install

# 2. Запуск системы
make dev

# 3. Открыть в браузере
open http://localhost:5173
```

## 📦 Пакет передачи

- **[docs/handover/HANDOVER_PACKAGE.md](./docs/handover/HANDOVER_PACKAGE.md)** - Полный пакет передачи
- **[docs/handover/TECHNICAL_SUMMARY.md](./docs/handover/TECHNICAL_SUMMARY.md)** - Техническое описание
- **[docs/handover/DELIVERY_CHECKLIST.md](./docs/handover/DELIVERY_CHECKLIST.md)** - Чек-лист передачи

## 🏗️ Архитектура

```
React Frontend (5173) ←→ Go Backend (8080) ←→ Python Analytics (8000)
                                ↓
                         PostgreSQL (5432)
                                ↓
                         ChromaDB (8001)
                                ↓
                         Ollama (11434)
```

## ✨ Основные возможности

- **🤖 AI-чат с RAG** - интеграция с Ollama моделями
- **🔧 RESTful API** - FastAPI (Python) + Gin (Go)
- **💾 PostgreSQL** - SQLAlchemy + GORM
- **🐳 Docker** - полная контейнеризация
- **📊 Аналитика** - сбор метрик, экспорт данных

## 🚨 Известные проблемы

- **BDUI** - в разработке (20% готов)
- **Go Backend** - неполная реализация (40% готов)
- **Python рефакторинг** - требуется перенос бизнес-логики в Go

## 📞 Поддержка

- **Документация:** [docs/](./docs/)
- **Пакет передачи:** [docs/handover/](./docs/handover/)

---

**Готово к передаче заказчику!**