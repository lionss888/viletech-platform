.PHONY: start stop restart status logs metrics db-status help logs-backend logs-ollama logs-litellm logs-tgi logs-init clean update

# === ОСНОВНЫЕ КОМАНДЫ ===

start:
	@./start.sh

stop:
	@./stop.sh

restart:
	@make stop
	@sleep 2
	@make start

# === ОБНОВЛЕНИЕ ===

update:
	@echo "🔄 Проверка обновлений..."
	@git fetch origin
	@git status
	@echo ""
	@read -p "Обновить? (y/n): " confirm && [ "$$confirm" = "y" ] && git pull origin $$(git rev-parse --abbrev-ref HEAD)

# === СТАТУС И МОНИТОРИНГ ===

status:
	@echo ""
	@echo "📊 СТАТУС VILI"
	@echo "==============="
	@docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
	@echo ""
	@echo "🤖 Ollama Модели:"
	@curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[] | "   \(.name) (\(.size / 1024 / 1024 / 1024 | floor)GB)"' 2>/dev/null || echo "   ⏳ Ollama загружается..."
	@echo ""
	@echo "🔮 LiteLLM:"
	@curl -s http://localhost:4000/health 2>/dev/null | jq -r '"   Статус: \(.status)"' 2>/dev/null || echo "   ⏳ LiteLLM загружается..."
	@echo ""
	@echo "🏦 FinGPT (TGI):"
	@curl -s http://localhost:8080/health 2>/dev/null && echo "   ✅ Готов" || echo "   ⏳ TGI загружается..."
	@echo ""
	@echo "💚 Backend:"
	@curl -s http://localhost:8000/api/v1/health 2>/dev/null | jq -r '"   Статус: \(.status)"' 2>/dev/null || echo "   ⏳ Backend загружается..."
	@echo ""
	@echo "📚 База данных:"
	@curl -s http://localhost:8000/api/v1/stats 2>/dev/null | jq -r '"   Документов: \(.total_documents)"' 2>/dev/null || echo "   ⏳ Загружается..."
	@echo ""

logs:
	@docker compose logs -f

logs-backend:
	@docker compose logs -f backend

logs-ollama:
	@docker compose logs -f ollama-1 ollama-2 nginx

logs-litellm:
	@docker compose logs -f litellm

logs-tgi:
	@docker compose logs -f tgi-fingpt

logs-init:
	@docker compose logs ollama-init-priority

# === АНАЛИТИКА ===

metrics:
	@echo "📈 Метрики использования:"
	@curl -s http://localhost:8000/api/v1/metrics 2>/dev/null | jq || echo "Backend недоступен"

db-status:
	@echo "🗄️  Статус БД:"
	@docker exec vili-db psql -U vili -d vili -c "\
	  SELECT 'Документов: ' || COUNT(*) FROM payment_documents; \
	  SELECT 'Анализов: ' || COUNT(*) FROM analysis_results WHERE success = true; \
	  SELECT 'Compliance проверок: ' || COUNT(*) FROM compliance_checks; \
	  SELECT 'Оценок рисков: ' || COUNT(*) FROM risk_assessments; \
	  SELECT 'База знаний: ' || COUNT(*) FROM compliance_knowledge_base;" 2>/dev/null || echo "БД недоступна"

# === УПРАВЛЕНИЕ МОДЕЛЯМИ ===

ollama-models:
	@echo "🤖 Установленные Ollama модели:"
	@curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[] | "\(.name)\t\(.size / 1024 / 1024 / 1024 | floor)GB"' || echo "Ollama недоступен"

ollama-pull:
	@echo "📥 Загрузка модели в Ollama..."
	@read -p "Название модели: " model && curl -X POST http://localhost:11434/api/pull -d '{"name":"'$$model'"}'

ollama-pull-model:
	@if [ -z "$(MODEL)" ]; then \
		echo "❌ Укажите модель: make ollama-pull-model MODEL=<название>"; \
		echo ""; \
		echo "Примеры популярных моделей:"; \
		echo "  make ollama-pull-model MODEL=qwen2.5:7b    # Qwen 2.5 7B (~4.5GB)"; \
		echo "  make ollama-pull-model MODEL=qwen2.5:3b    # Qwen 2.5 3B (~2GB)"; \
		echo "  make ollama-pull-model MODEL=mistral        # Mistral (~4GB)"; \
		echo "  make ollama-pull-model MODEL=phi3:mini     # Phi3 Mini (~2GB)"; \
		exit 1; \
	fi
	@echo "📥 Загрузка модели $(MODEL) в Ollama..."
	@curl -X POST http://localhost:11434/api/pull -d '{"name":"$(MODEL)"}'

ollama-pull-popular:
	@echo "📥 Загрузка популярных дополнительных моделей..."
	@echo "Это может занять время. Модели загружаются последовательно."
	@echo ""
	@read -p "Продолжить? (y/n): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo ""
	@echo "1/4: Qwen 2.5 7B (~4.5GB)..."
	@curl -X POST http://localhost:11434/api/pull -d '{"name":"qwen2.5:7b"}' || echo "⚠️  Ошибка загрузки qwen2.5:7b"
	@echo ""
	@echo "2/4: Qwen 2.5 3B (~2GB)..."
	@curl -X POST http://localhost:11434/api/pull -d '{"name":"qwen2.5:3b"}' || echo "⚠️  Ошибка загрузки qwen2.5:3b"
	@echo ""
	@echo "3/4: Mistral (~4GB)..."
	@curl -X POST http://localhost:11434/api/pull -d '{"name":"mistral"}' || echo "⚠️  Ошибка загрузки mistral"
	@echo ""
	@echo "4/4: Phi3 Mini (~2GB)..."
	@curl -X POST http://localhost:11434/api/pull -d '{"name":"phi3:mini"}' || echo "⚠️  Ошибка загрузки phi3:mini"
	@echo ""
	@echo "✅ Загрузка завершена! Проверьте: make ollama-models"

litellm-models:
	@echo "🔮 Доступные модели через LiteLLM:"
	@curl -s http://localhost:4000/model/info 2>/dev/null | jq || echo "LiteLLM недоступен"

# === ОЧИСТКА ===

clean:
	@echo "🧹 Остановка и удаление контейнеров..."
	@docker compose down
	@echo ""
	@read -p "Удалить данные (volumes)? (y/n): " confirm && [ "$$confirm" = "y" ] && docker compose down -v
	@echo "✅ Очистка завершена"

clean-all:
	@echo "⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные!"
	@read -p "Продолжить? (y/n): " confirm && [ "$$confirm" = "y" ] && docker compose down -v --rmi local
	@echo "✅ Полная очистка завершена"

# === РАЗРАБОТКА ===

dev:
	@echo "🛠️  Запуск в режиме разработки..."
	@docker compose up -d postgres redis rabbitmq
	@docker compose up -d ollama-1 ollama-2 nginx
	@docker compose up -d litellm
	@echo "✅ Инфраструктура запущена. Backend запускайте вручную."

dev-backend:
	@echo "🐍 Запуск backend в dev режиме..."
	@cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# === ТЕСТИРОВАНИЕ ===

test:
	@echo "🧪 Запуск тестов..."
	@cd backend && pytest tests/ -v

test-coverage:
	@echo "📊 Запуск тестов с coverage..."
	@cd backend && pytest tests/ --cov=app --cov-report=html

# === МИГРАЦИИ БД ===

db-migrate:
	@echo "🗄️  Применение миграций БД..."
	@docker exec vili-db psql -U vili -d vili -f /docker-entrypoint-initdb.d/init.sql

db-shell:
	@echo "💻 Подключение к БД..."
	@docker exec -it vili-db psql -U vili -d vili

# === ПОМОЩЬ ===

help:
	@echo ""
	@echo "🤖 VILI Payment Assistant — Команды"
	@echo "===================================="
	@echo ""
	@echo "ЗАПУСК:"
	@echo "  make start          - Запустить всю систему"
	@echo "  make stop           - Остановить"
	@echo "  make restart        - Перезапустить"
	@echo "  make status         - Показать статус всех сервисов"
	@echo ""
	@echo "ЛОГИ:"
	@echo "  make logs           - Все логи"
	@echo "  make logs-init      - Логи инициализации"
	@echo "  make logs-backend   - Логи backend"
	@echo "  make logs-ollama    - Логи Ollama cluster"
	@echo "  make logs-litellm   - Логи LiteLLM"
	@echo "  make logs-tgi       - Логи FinGPT (TGI)"
	@echo ""
	@echo "МОДЕЛИ:"
	@echo "  make ollama-models       - Список установленных Ollama моделей"
	@echo "  make ollama-pull-model   - Загрузить модель (MODEL=<название>)"
	@echo "  make ollama-pull-popular - Загрузить популярные модели (qwen, mistral, phi3)"
	@echo "  make litellm-models      - Список моделей через LiteLLM"
	@echo ""
	@echo "ДАННЫЕ:"
	@echo "  make db-status      - Статус базы данных"
	@echo "  make db-shell       - Подключиться к БД"
	@echo "  make db-migrate     - Применить миграции"
	@echo "  make metrics        - Метрики использования"
	@echo ""
	@echo "РАЗРАБОТКА:"
	@echo "  make dev            - Запуск инфраструктуры для разработки"
	@echo "  make dev-backend    - Запуск backend в dev режиме"
	@echo "  make test           - Запустить тесты"
	@echo "  make test-coverage  - Тесты с coverage"
	@echo ""
	@echo "ОБСЛУЖИВАНИЕ:"
	@echo "  make update         - Проверить обновления"
	@echo "  make clean          - Очистка контейнеров"
	@echo "  make clean-all      - Полная очистка (включая данные)"
	@echo ""
