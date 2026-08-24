#!/bin/bash

# =====================================================
# VILI Payment Assistant - Docker запуск
# =====================================================
# Для серверов и облачных узлов
# Запускает все сервисы в Docker контейнерах
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

# Проверка Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен!"
        echo "Установите Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker не запущен!"
        echo "Запустите Docker и попробуйте снова."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен!"
        exit 1
    fi
    
    success "Docker готов"
}

# Проверка ресурсов
check_resources() {
    header "ПРОВЕРКА РЕСУРСОВ"
    
    # Проверка RAM
    TOTAL_RAM=$(sysctl -n hw.memsize 2>/dev/null || grep MemTotal /proc/meminfo | awk '{print $2}' || echo "0")
    if [ "$TOTAL_RAM" != "0" ]; then
        RAM_GB=$((TOTAL_RAM / 1024 / 1024 / 1024))
        if [ "$RAM_GB" -lt 16 ]; then
            warning "Рекомендуется минимум 16GB RAM. Обнаружено: ${RAM_GB}GB"
        else
            success "RAM: ${RAM_GB}GB"
        fi
    fi
    
    # Проверка дискового пространства
    AVAILABLE_SPACE=$(df -h . | tail -1 | awk '{print $4}')
    info "Доступно места: $AVAILABLE_SPACE"
    warning "Рекомендуется минимум 50GB для моделей"
}

# Выбор режима запуска
select_mode() {
    header "ВЫБОР РЕЖИМА ЗАПУСКА"
    
    echo "1. Полный запуск (все сервисы включая TGI/FinGPT)"
    echo "2. Быстрый запуск (без TGI, только Ollama)"
    echo "3. Минимальный (только БД, Redis, Backend)"
    echo ""
    read -p "Выберите режим (1-3): " -n 1 -r MODE
    echo ""
    
    case $MODE in
        1)
            COMPOSE_SERVICES=""
            info "Запуск всех сервисов (может занять 10-15 минут для загрузки моделей)"
            ;;
        2)
            COMPOSE_SERVICES="postgres redis ollama-1 ollama-2 nginx ollama-init-priority litellm backend"
            info "Быстрый запуск без TGI"
            ;;
        3)
            COMPOSE_SERVICES="postgres redis backend"
            info "Минимальный запуск (без LLM)"
            ;;
        *)
            error "Неверный выбор"
            exit 1
            ;;
    esac
}

# Запуск сервисов
start_services() {
    header "ЗАПУСК СЕРВИСОВ"
    
    if [ -z "$COMPOSE_SERVICES" ]; then
        info "Запуск всех сервисов..."
        docker compose up -d
    else
        info "Запуск выбранных сервисов: $COMPOSE_SERVICES"
        docker compose up -d $COMPOSE_SERVICES
    fi
    
    echo ""
    info "Ожидание готовности сервисов..."
    
    # Ждём PostgreSQL
    wait_for_service "PostgreSQL" "docker exec vili-db pg_isready -U vili -d vili" 30
    
    # Ждём Redis
    wait_for_service "Redis" "docker exec vili-redis redis-cli ping" 30
    
    # Ждём Backend
    wait_for_service "Backend API" "curl -sf http://localhost:8000/api/v1/health" 60
    
    # Если запущены LLM сервисы
    if docker ps --format "{{.Names}}" | grep -q "vili-nginx"; then
        wait_for_service "Ollama" "curl -sf http://localhost:11434/api/tags" 60
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "vili-litellm"; then
        wait_for_service "LiteLLM" "curl -sf http://localhost:4000/health" 60
    fi
    
    echo ""
    success "Основные сервисы запущены!"
}

# Ожидание готовности сервиса
wait_for_service() {
    local SERVICE_NAME=$1
    local CHECK_COMMAND=$2
    local MAX_WAIT=$3
    
    echo -n "$SERVICE_NAME"
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if eval "$CHECK_COMMAND" &> /dev/null; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        WAITED=$((WAITED + 2))
    done
    echo -e " ${YELLOW}⏳${NC} (загружается...)"
}

# Показать статус
show_status() {
    header "СТАТУС СИСТЕМЫ"
    
    echo "Контейнеры:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
    
    echo ""
    echo "Доступные сервисы:"
    
    if curl -sf http://localhost:8000/api/v1/health &> /dev/null; then
        echo -e "  ${GREEN}✅${NC} Backend API: http://localhost:8000"
        echo -e "  ${GREEN}✅${NC} API Docs: http://localhost:8000/api/docs"
        echo -e "  ${GREEN}✅${NC} Чат: http://localhost:8000/chat/"
    else
        echo -e "  ${YELLOW}⏳${NC} Backend API: загружается..."
    fi
    
    if curl -sf http://localhost:11434/api/tags &> /dev/null; then
        MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys, json; data=json.load(sys.stdin); print(', '.join([m['name'] for m in data.get('models', [])]) if data.get('models') else 'нет моделей')" 2>/dev/null || echo "загружаются...")
        echo -e "  ${GREEN}✅${NC} Ollama: http://localhost:11434 (модели: $MODELS)"
    fi
    
    if curl -sf http://localhost:4000/health &> /dev/null; then
        echo -e "  ${GREEN}✅${NC} LiteLLM: http://localhost:4000"
    fi
    
    echo ""
    echo "Команды управления:"
    echo "  make stop           - остановить все сервисы"
    echo "  make status         - статус системы"
    echo "  make logs           - просмотр логов"
    echo "  make logs-backend   - логи backend"
}

# =====================================================
# MAIN
# =====================================================

header "VILI PAYMENT ASSISTANT - DOCKER ЗАПУСК"

check_docker
check_resources
select_mode
start_services
show_status

echo ""
success "Система запущена и готова к работе!"
