.PHONY: help dev test build up down clean install lint format backup restore

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
dev: ## Start development server (Go + Python)
	docker compose up --build go-backend python-api client-dev

dev-go: ## Start Go backend only
	cd go-backend && go run cmd/api/main.go

dev-grpc: ## Start gRPC server only
	cd go-backend && go run cmd/grpc/main.go

dev-eventbus: ## Start Event Bus with Kafka
	docker compose up --build kafka zookeeper

dev-eventbus-go: ## Start Event Bus Go service
	cd go-backend && go run cmd/eventbus/main.go

dev-monitoring: ## Start monitoring with Jaeger
	docker compose up --build jaeger

dev-monitoring-go: ## Start monitoring Go service
	cd go-backend && go run cmd/monitoring/main.go

dev-python: ## Start Python API only
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-fast: ## Fast development (Python API only)
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

install: ## Install dependencies
	pip install -e .

test: ## Run tests
	pytest

test-coverage: ## Run tests with coverage
	pytest --cov=app --cov-report=html --cov-report=term

lint: ## Run linters
	black --check .
	isort --check-only .
	flake8 .

format: ## Format code
	black .
	isort .

# Quick builds (only changed services)
build-go: ## Build only Go backend container
	docker compose build go-backend

build-python: ## Build only Python API container
	docker compose build python-api

build-client: ## Build only client container
	docker compose build client

# gRPC commands
grpc-generate: ## Generate gRPC code from proto files
	cd go-backend && make -f Makefile.grpc generate

grpc-clean: ## Clean generated gRPC files
	cd go-backend && make -f Makefile.grpc clean

grpc-install-tools: ## Install gRPC tools
	cd go-backend && make -f Makefile.grpc install-tools

grpc-test: ## Run gRPC tests
	cd go-backend && make -f Makefile.grpc test-grpc

grpc-build: ## Build gRPC server
	cd go-backend && make -f Makefile.grpc build-grpc

build-changed: ## Build only changed services
	@if git diff --name-only HEAD~1 | grep -q "go-backend/"; then \
		echo "Rebuilding Go backend..."; \
		docker compose build go-backend; \
	fi
	@if git diff --name-only HEAD~1 | grep -q "app/"; then \
		echo "Rebuilding Python API..."; \
		docker compose build python-api; \
	fi
	@if git diff --name-only HEAD~1 | grep -q "client/"; then \
		echo "Rebuilding client..."; \
		docker compose build client; \
	fi

# Quick restarts
up-go: ## Restart only Go backend service
	docker compose up -d go-backend

up-python: ## Restart only Python API service
	docker compose up -d python-api

up-client: ## Restart only client service
	docker compose up -d client

restart-go: ## Restart Go backend service
	docker compose restart go-backend

restart-python: ## Restart Python API service
	docker compose restart python-api

restart-client: ## Restart client service
	docker compose restart client

# Database
migrate: ## Run database migrations
	alembic upgrade head

migrate-create: ## Create new migration
	alembic revision --autogenerate -m "$(message)"

db-smoke: ## Test database connection
	./scripts/psql_smoke.sh

db-migrate: ## Run database migrations
	docker compose run --rm api alembic upgrade head

db-reset: ## Reset database (WARNING: destroys all data)
	alembic downgrade base
	alembic upgrade head

# Ollama
ollama-setup: ## Setup Ollama and pull models
	./scripts/ensure_ollama.sh
	./scripts/model_pull.sh
	./scripts/setup_embeddings.sh

model-pull: ## Pull optimized models
	./scripts/model_pull.sh

model-build: ## Build custom model from Modelfile
	ollama create $(TAG) -f $(FILE)

embeddings-setup: ## Setup embeddings models
	./scripts/setup_embeddings.sh

# Docker
build: ## Build Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Show logs
	docker compose logs -f

shell: ## Open database shell
	docker compose exec db psql -U user -d appdb

# Client
client-dev: ## Run client in development mode
	cd client && npm run dev

client-build: ## Build client for production
	cd client && npm run build

client-test: ## Run client tests
	cd client && npm test

# Customer environment
customer-up: ## Start with external PostgreSQL (customer environment)
	docker compose -f docker-compose.yml -f docker-compose.customer.yml up --build

customer-down: ## Stop customer environment
	docker compose -f docker-compose.yml -f docker-compose.customer.yml down

# Blue-Green Deployment
deploy-blue: ## Deploy blue version
	./scripts/deploy.sh blue

deploy-green: ## Deploy green version
	./scripts/deploy.sh green

switch-green: ## Switch to green version
	./scripts/deploy.sh switch green

switch-blue: ## Switch to blue version
	./scripts/deploy.sh switch blue

deploy-status: ## Check deployment status
	./scripts/deploy.sh status

rollback: ## Rollback to previous version
	./scripts/deploy.sh rollback

# Production deployment
prod-up: ## Start production with Blue-Green
	docker compose -f docker-compose.blue-green.yml up -d

prod-down: ## Stop production
	docker compose -f docker-compose.blue-green.yml down

# Learning and Training
train: ## Train model on conversation data
	./scripts/train_model.sh

train-conversation: ## Train model on specific conversation
	./scripts/train_model.sh -c $(CONVO_ID)

export-data: ## Export training data
	./scripts/train_model.sh -x

rag-stats: ## Show RAG system statistics
	curl -s http://localhost:8000/v1/learning/rag/stats | jq

add-to-rag: ## Add conversation to RAG system
	curl -X POST "http://localhost:8000/v1/learning/rag/add-conversation?convo_id=$(CONVO_ID)"

rag-search: ## Search RAG context
	curl -s "http://localhost:8000/v1/learning/rag/search?query=$(QUERY)&top_k=5" | jq

rag-reset: ## Reset RAG system
	curl -X POST http://localhost:8000/v1/learning/rag/reset

rag-delete: ## Delete conversation from RAG
	curl -X DELETE "http://localhost:8000/v1/learning/rag/conversation/$(CONVO_ID)"

# Analytics and Data Export
analytics-daily: ## Get daily analytics
	curl -s http://localhost:8000/v1/analytics/daily | jq

analytics-user: ## Get user analytics
	curl -s http://localhost:8000/v1/analytics/user/$(USER_ID) | jq

analytics-conversation: ## Get conversation analytics
	curl -s http://localhost:8000/v1/analytics/conversation/$(CONVERSATION_ID) | jq

analytics-topics: ## Get topics analysis
	curl -s http://localhost:8000/v1/analytics/topics | jq

analytics-sessions: ## Get active sessions
	curl -s http://localhost:8000/v1/analytics/sessions | jq

analytics-metrics: ## Get system metrics
	curl -s http://localhost:8000/v1/analytics/metrics | jq

export-daily: ## Export daily analytics report
	./scripts/export_analytics.sh --type daily --format json

export-user: ## Export user analytics
	./scripts/export_analytics.sh --type user --user-id $(USER_ID) --format xlsx

export-conversation: ## Export conversation analytics
	./scripts/export_analytics.sh --type conversation --conversation-id $(CONVERSATION_ID) --format json

export-raw: ## Export raw interaction data
	./scripts/export_analytics.sh --type raw --format csv

export-comprehensive: ## Export comprehensive analytics report
	./scripts/export_analytics.sh --type comprehensive --format xlsx

export-topics: ## Export topics analysis
	./scripts/export_analytics.sh --type topics --format xlsx

# Evaluation
eval: ## Run model evaluation
	python -m app.eval.run_evaluation --tag $(TAG) --data $(DATA)

# Health checks
health: ## Check all services health
	@echo "Checking Go backend health..."
	@curl -s http://localhost:8080/api/v1/health | jq
	@echo "Checking Python API health..."
	@curl -s http://localhost:8000/v1/health | jq
	@echo "Checking Ollama health..."
	@curl -s http://localhost:8000/v1/health/ollama | jq
	@echo "Checking DB health..."
	@curl -s http://localhost:8080/api/v1/health/db | jq

health-quick: ## Quick health check
	@curl -s http://localhost:8000/health || echo "Service not available"

# Monitoring
logs-api: ## Show API logs
	docker compose logs -f api

logs-client: ## Show client logs
	docker compose logs -f client

logs-all: ## Show all logs
	docker compose logs -f

# Performance
perf-test: ## Run performance test
	@echo "Running performance test..."
	@for i in {1..10}; do \
		echo "Request $$i:"; \
		time curl -s http://localhost:8000/v1/health > /dev/null; \
	done

# Analytics Testing
analytics-test: ## Test all analytics endpoints
	./scripts/test_analytics_endpoints.sh

analytics-generate: ## Generate test analytics data
	python3 scripts/generate_test_analytics.py

analytics-ui: ## Open analytics test UI
	@echo "Opening analytics test UI..."
	@echo "File: file://$(PWD)/scripts/test_analytics_ui.html"
	@if command -v open >/dev/null 2>&1; then \
		open "file://$(PWD)/scripts/test_analytics_ui.html"; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open "file://$(PWD)/scripts/test_analytics_ui.html"; \
	else \
		echo "Please open: file://$(PWD)/scripts/test_analytics_ui.html"; \
	fi

analytics-setup: ## Setup analytics for testing
	@echo "Setting up analytics for testing..."
	@echo "1. Generating test data..."
	python3 scripts/generate_test_analytics.py
	@echo "2. Testing endpoints..."
	./scripts/test_analytics_endpoints.sh
	@echo "3. Opening test UI..."
	@if command -v open >/dev/null 2>&1; then \
		open "file://$(PWD)/scripts/test_analytics_ui.html"; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open "file://$(PWD)/scripts/test_analytics_ui.html"; \
	else \
		echo "Please open: file://$(PWD)/scripts/test_analytics_ui.html"; \
	fi

# Cleanup
clean: ## Clean up containers and volumes
	docker compose down -v --remove-orphans
	docker system prune -f
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .coverage htmlcov/
	cd client && rm -rf dist/ node_modules/.cache/

# Backup and Restore
backup-full: ## Create full system backup
	@echo "🚀 Creating full system backup..."
	bash scripts/backup_full.sh

backup-db: ## Create database backup only
	@echo "💾 Creating database backup..."
	bash scripts/backup_database.sh

backup-models: ## Create models backup only
	@echo "🤖 Creating models backup..."
	bash scripts/backup_models.sh

backup: backup-full ## Alias for full backup

restore-db: ## Restore database from latest backup
	@echo "🔄 Restoring database from latest backup..."
	bash scripts/restore_database.sh latest

restore: restore-db ## Alias for database restore

backup-list: ## List available backups
	@echo "📋 Available backups:"
	@echo "Full backups:"
	@ls -lah backups/full/ 2>/dev/null || echo "No full backups found"
	@echo ""
	@echo "Database backups:"
	@ls -lah backups/database/ 2>/dev/null || echo "No database backups found"

backup-clean: ## Clean old backups (older than 7 days)
	@echo "🧹 Cleaning old backups..."
	find backups/ -name "*.gz" -mtime +7 -delete 2>/dev/null || true
	@echo "✅ Old backups cleaned"

# Data Retention
cleanup-dry-run: ## Show what data would be deleted (dry run)
	@echo "🔍 Showing what data would be deleted..."
	bash scripts/cleanup_data.sh --dry-run

cleanup-data: ## Clean old data with default policy
	@echo "🗑️ Cleaning old data..."
	bash scripts/cleanup_data.sh

cleanup-development: ## Clean data with development policy
	@echo "🗑️ Cleaning data with development policy..."
	bash scripts/cleanup_data.sh --policy development

cleanup-production: ## Clean data with production policy
	@echo "🗑️ Cleaning data with production policy..."
	bash scripts/cleanup_data.sh --policy production

cleanup-messages: ## Clean only messages table
	@echo "🗑️ Cleaning messages table..."
	bash scripts/cleanup_data.sh --table messages

cleanup: cleanup-data ## Alias for data cleanup

# Security
security-scan: ## Run comprehensive security scan
	./scripts/security-scan.sh all

security-scan-go: ## Run Go security scan only
	./scripts/security-scan.sh go

security-scan-python: ## Run Python security scan only
	./scripts/security-scan.sh python

security-install: ## Install security tools
	@echo "Installing Go security tools..."
	go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@echo "Installing Python security tools..."
	pip install bandit safety pip-audit
	@echo "Installing pre-commit hooks..."
	pip install pre-commit
	pre-commit install

security-pre-commit: ## Run pre-commit security checks
	pre-commit run --all-files

security-reports: ## Generate security reports
	mkdir -p security-reports
	./scripts/security-scan.sh all
	@echo "Security reports generated in security-reports/"

security-clean: ## Clean security reports
	rm -rf security-reports/
	rm -f bandit-report.json safety-report.json gosec-report.json