#!/bin/bash

# =====================================================
# VILI Payment Assistant - Локальный запуск
# =====================================================
# Для разработки на локальной машине
# Требует: Python 3.11+, PostgreSQL, Redis (можно в Docker)
# =====================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Функции вывода
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"; }

# Проверка Python
check_python() {
    if ! command -v python3 &> /dev/null; then
        error "Python 3 не установлен!"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d'.' -f1,2)
    REQUIRED_VERSION="3.11"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        error "Требуется Python 3.11 или выше. Установлен: $PYTHON_VERSION"
        exit 1
    fi
    
    success "Python $(python3 --version | awk '{print $2}') готов"
}

# Проверка виртуального окружения
check_venv() {
    if [ ! -d "backend/.venv" ]; then
        warning "Виртуальное окружение не найдено. Создаю..."
        cd backend
        python3 -m venv .venv
        cd ..
        success "Виртуальное окружение создано"
    fi
}

# Установка зависимостей
install_dependencies() {
    header "УСТАНОВКА ЗАВИСИМОСТЕЙ"
    
    cd backend
    source .venv/bin/activate
    
    info "Обновление pip..."
    pip install --upgrade pip --quiet
    
    info "Установка зависимостей..."
    pip install -r requirements.txt --quiet
    
    success "Зависимости установлены"
    cd ..
}

# Проверка Docker для БД
check_docker_services() {
    header "ПРОВЕРКА СЕРВИСОВ"
    
    if ! command -v docker &> /dev/null; then
        warning "Docker не установлен. PostgreSQL и Redis должны быть установлены локально."
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        warning "Docker не запущен. Запустите Docker Desktop."
        return 1
    fi
    
    # Проверяем, запущены ли контейнеры
    if docker ps --format "{{.Names}}" | grep -q "vili-db\|vili-redis"; then
        success "PostgreSQL и Redis запущены в Docker"
        return 0
    else
        info "Запускаю PostgreSQL и Redis в Docker..."
        docker compose up -d postgres redis
        sleep 3
        success "PostgreSQL и Redis запущены"
        return 0
    fi
}

# Создание директорий
create_directories() {
    info "Создание необходимых директорий..."
    mkdir -p backend/uploads
    mkdir -p backend/logs
    success "Директории созданы"
}

# Настройка переменных окружения
setup_env() {
    header "НАСТРОЙКА ОКРУЖЕНИЯ"
    
    if [ ! -f "backend/.env" ]; then
        info "Создание .env файла..."
        cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://vili:vili_password@localhost:5432/vili

# Redis
REDIS_URL=redis://localhost:6379/0

# RabbitMQ (опционально)
RABBITMQ_URL=amqp://vili:vili_password@localhost:5672//

# LLM Services (опционально, можно использовать Docker)
LITELLM_URL=http://localhost:4000
OLLAMA_URL=http://localhost:11434

# Upload directory
UPLOAD_DIR=./uploads

# Environment
ENVIRONMENT=development
DEBUG=True
EOF
        success ".env файл создан"
    else
        info ".env файл уже существует"
    fi
}

# Запуск backend
start_backend() {
    header "ЗАПУСК BACKEND"
    
    cd backend
    source .venv/bin/activate
    
    # Загружаем переменные окружения из .env если есть
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Устанавливаем значения по умолчанию если не заданы
    export DATABASE_URL=${DATABASE_URL:-"postgresql://vili:vili_password@localhost:5432/vili"}
    export REDIS_URL=${REDIS_URL:-"redis://localhost:6379/0"}
    export LITELLM_URL=${LITELLM_URL:-"http://localhost:4000"}
    export OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
    export UPLOAD_DIR=${UPLOAD_DIR:-"./uploads"}
    export TESTING="false"
    
    info "Запуск FastAPI сервера..."
    info "Backend будет доступен на: http://localhost:8000"
    info "API документация: http://localhost:8000/api/docs"
    info "Чат интерфейс: http://localhost:8000/chat/"
    info ""
    info "Для остановки нажмите Ctrl+C"
    echo ""
    
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}

# =====================================================
# MAIN
# =====================================================

header "VILI PAYMENT ASSISTANT - ЛОКАЛЬНЫЙ ЗАПУСК"

check_python
check_venv
install_dependencies
create_directories
setup_env
check_docker_services

# Запуск проверки перед запуском
header "ПРОВЕРКА ПЕРЕД ЗАПУСКОМ"
cd backend
source .venv/bin/activate

# Загружаем переменные окружения из .env если есть
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Устанавливаем значения по умолчанию если не заданы
export DATABASE_URL=${DATABASE_URL:-"postgresql://vili:vili_password@localhost:5432/vili"}
export REDIS_URL=${REDIS_URL:-"redis://localhost:6379/0"}
export LITELLM_URL=${LITELLM_URL:-"http://localhost:4000"}
export OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
export UPLOAD_DIR=${UPLOAD_DIR:-"./uploads"}
export TESTING="false"

info "Запуск проверки конфигурации..."
if python scripts/preflight_check.py; then
    success "Проверка пройдена!"
else
    warning "Проверка выявила проблемы, но можно продолжить"
fi

cd ..

echo ""
info "💡 Совет: Для LLM сервисов (Ollama, LiteLLM) используйте:"
info "   docker compose up -d ollama-1 ollama-2 nginx litellm"
echo ""

read -p "Запустить backend сейчас? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    start_backend
else
    info "Запустите вручную:"
    echo "  cd backend"
    echo "  source .venv/bin/activate"
    echo "  export DATABASE_URL=postgresql://vili:vili_password@localhost:5432/vili"
    echo "  export REDIS_URL=redis://localhost:6379/0"
    echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
fi
