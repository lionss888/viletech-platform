#!/bin/bash

# AMG BDUI System Setup Script
# Установка и настройка системы

set -e

echo "🚀 AMG Backend-Driven UI System Setup"
echo "======================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi
    
    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi
    
    success "Все зависимости проверены"
}

# Создание .env файла
create_env_file() {
    log "Создание .env файла..."
    
    if [ ! -f .env ]; then
        cat > .env << 'ENVEOF'
# AMG BDUI System Environment Variables

# Database
DATABASE_URL=postgres://amg_user:amg_password@localhost:5432/amg_bdui?sslmode=disable
POSTGRES_DB=amg_bdui
POSTGRES_USER=amg_user
POSTGRES_PASSWORD=amg_password

# Redis
REDIS_URL=localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=8080
ENVIRONMENT=development
LOG_LEVEL=info

# Frontend
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_WS_URL=ws://localhost:8080/ws

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin
PROMETHEUS_RETENTION_TIME=200h
ENVEOF
        success ".env файл создан"
    else
        warning ".env файл уже существует"
    fi
}

# Основная функция
main() {
    log "Начало установки AMG BDUI System"
    
    check_dependencies
    create_env_file
    
    echo ""
    success "🎉 AMG BDUI System готова к запуску!"
    echo ""
    echo "Для запуска используйте:"
    echo "  make up     - Запуск всех сервисов"
    echo "  make dev    - Режим разработки"
    echo "  make health - Проверка статуса"
    echo ""
}

# Запуск
main "$@"
