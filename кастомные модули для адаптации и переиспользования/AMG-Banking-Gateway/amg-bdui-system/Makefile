# AMG Backend-Driven UI System Makefile

.PHONY: help build up down restart logs test clean install dev

# Default target
help: ## Show this help message
	@echo "AMG Backend-Driven UI System"
	@echo "=============================="
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
install: ## Install all dependencies
	@echo "Installing dependencies..."
	cd backend && go mod download
	cd frontend && npm install
	@echo "Dependencies installed successfully!"

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose up -d postgres redis
	@echo "Waiting for services to be ready..."
	sleep 10
	@echo "Starting backend..."
	cd backend && go run cmd/server/main.go &
	@echo "Starting frontend..."
	cd frontend && npm run dev &
	@echo "Development environment started!"
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"

# Docker commands
build: ## Build all Docker images
	@echo "Building Docker images..."
	docker-compose build
	@echo "Build completed!"

up: ## Start all services
	@echo "Starting all services..."
	docker-compose up -d
	@echo "Services started!"
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"
	@echo "Grafana: http://localhost:3001"
	@echo "Prometheus: http://localhost:9090"

down: ## Stop all services
	@echo "Stopping all services..."
	docker-compose down
	@echo "Services stopped!"

restart: ## Restart all services
	@echo "Restarting all services..."
	docker-compose restart
	@echo "Services restarted!"

logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

# Testing commands
test: ## Run all tests
	@echo "Running all tests..."
	@echo "Running backend tests..."
	cd backend && go test ./... -v
	@echo "Running frontend tests..."
	cd frontend && npm test -- --run
	@echo "All tests completed!"

test-unit: ## Run unit tests only
	@echo "Running unit tests..."
	cd backend && go test ./... -v -short
	cd frontend && npm test -- --run --coverage
	@echo "Unit tests completed!"

# Health check commands
health: ## Check health of all services
	@echo "Checking service health..."
	@echo "Backend health:"
	@curl -s http://localhost:8080/health | jq . || echo "Backend not responding"
	@echo "Frontend health:"
	@curl -s http://localhost:3000 | head -1 || echo "Frontend not responding"
	@echo "Database health:"
	@curl -s http://localhost:8080/health/database | jq . || echo "Database not responding"
	@echo "Cache health:"
	@curl -s http://localhost:8080/health/cache | jq . || echo "Cache not responding"

# Cleanup commands
clean: ## Clean up containers and volumes
	@echo "Cleaning up..."
	docker-compose down -v
	docker system prune -f
	@echo "Cleanup completed!"

clean-all: ## Clean up everything including images
	@echo "Cleaning up everything..."
	docker-compose down -v
	docker system prune -af
	@echo "Complete cleanup completed!"

# Status commands
status: ## Show status of all services
	@echo "Service status:"
	docker-compose ps

ps: ## Show running containers
	docker ps --filter "name=amg-bdui"

# Quick start for development
quick-start: install up ## Quick start for development
	@echo "Quick start completed!"
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"
	@echo "Grafana: http://localhost:3001"
	@echo "Prometheus: http://localhost:9090"
