#!/bin/bash

# =====================================================
# VILI Payment Assistant - Скрипт запуска
# =====================================================
# Запускает все сервисы гибридной архитектуры:
# - Ollama Cluster (2 инстанса + Nginx LB)
# - TGI (FinGPT локально)
# - LiteLLM (Unified API)
# - PostgreSQL с pgvector
# - Redis, RabbitMQ
# - Backend API (FastAPI)
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
        echo "Запустите Docker Desktop и попробуйте снова."
        exit 1
    fi
    
    success "Docker готов"
}

# Проверка обновлений
check_updates() {
    header "ПРОВЕРКА ОБНОВЛЕНИЙ"
    
    if [ ! -d ".git" ]; then
        warning "Не git репозиторий, пропускаем проверку обновлений"
        return 0
    fi
    
    git fetch origin --quiet 2>/dev/null || {
        warning "Не удалось проверить обновления (нет доступа к remote)"
        return 0
    }
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
    
    if [ -z "$LOCAL" ] || [ -z "$REMOTE" ]; then
        warning "Не удалось определить состояние репозитория"
        return 0
    fi
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        success "Версия актуальна (ветка: $CURRENT_BRANCH)"
        return 0
    fi
    
    BEHIND=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
    
    if [ "$BEHIND" -gt "0" ]; then
        warning "Доступно обновлений: $BEHIND коммит(ов)"
        echo ""
        echo "Последние изменения:"
        git log --oneline HEAD..origin/$CURRENT_BRANCH 2>/dev/null | head -5
        echo ""
        
        read -p "Обновить до последней версии? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            info "Обновление..."
            git pull origin $CURRENT_BRANCH
            success "Обновлено!"
            
            if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q "backend/"; then
                warning "Изменения в backend - требуется пересборка"
                docker compose build backend
            fi
        else
            info "Обновление пропущено"
        fi
    fi
}

# Запуск сервисов
start_services() {
    header "ЗАПУСК СЕРВИСОВ"
    
    info "Запуск контейнеров..."
    docker compose up -d
    
    echo ""
    info "Ожидание готовности сервисов..."
    
    # Ждём PostgreSQL
    echo -n "PostgreSQL"
    MAX_WAIT=30
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if docker exec vili-db pg_isready -U vili -d vili &> /dev/null; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 1
        WAITED=$((WAITED + 1))
    done
    
    # Ждём Redis
    echo -n "Redis"
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if docker exec vili-redis redis-cli ping &> /dev/null; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 1
        WAITED=$((WAITED + 1))
    done
    
    # Ждём Ollama
    echo -n "Ollama Cluster"
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
        WAITED=$((WAITED + 2))
    done
    
    # Ждём LiteLLM
    echo -n "LiteLLM"
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
        WAITED=$((WAITED + 2))
    done
    
    # Ждём Backend
    echo -n "Backend API"
    MAX_WAIT=60
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
        WAITED=$((WAITED + 2))
    done
    
    # TGI загружается долго (приоритетная модель)
    echo -n "FinGPT (TGI) - приоритетная модель, загрузка..."
    MAX_WAIT=600  # До 10 минут на загрузку FinGPT
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 5
        WAITED=$((WAITED + 5))
        if [ $((WAITED % 30)) -eq 0 ]; then
            echo ""
            info "FinGPT загружается (~10-15GB при первом запуске)..."
            echo -n "  "
        fi
    done
    
    echo ""
    success "Основные сервисы запущены!"
    info "📌 Загружены только приоритетные модели (быстрый старт)"
    info "📌 Дополнительные модели: make ollama-pull-popular"
}

# Проверка статуса
show_status() {
    header "СТАТУС СИСТЕМЫ"
    
    echo "Контейнеры:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
    
    echo ""
    
    # Ollama модели
    MODELS=$(curl -sf http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[] | .name' | tr '\n' ', ' || echo "загружаются...")
    echo -e "🤖 Ollama модели: ${GREEN}${MODELS%,}${NC}"
    
    # LiteLLM
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "🔮 LiteLLM: ${GREEN}готов${NC}"
    else
        echo -e "🔮 LiteLLM: ${YELLOW}загружается${NC}"
    fi
    
    # Backend
    if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo -e "💚 Backend: ${GREEN}готов${NC}"
    else
        echo -e "💚 Backend: ${YELLOW}загружается${NC}"
    fi
    
    # TGI (приоритетная модель)
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "🏦 FinGPT (TGI): ${GREEN}готов${NC}"
    else
        echo -e "🏦 FinGPT (TGI): ${YELLOW}загружается (приоритетная модель, ~10-15 мин)${NC}"
    fi
}

# Финальная информация
show_info() {
    header "ГОТОВО К РАБОТЕ!"
    
    echo -e "🌐 Backend API:        ${GREEN}http://localhost:8000${NC}"
    echo -e "🔮 LiteLLM API:        ${GREEN}http://localhost:4000${NC}"
    echo -e "🤖 Ollama API:         ${GREEN}http://localhost:11434${NC}"
    echo -e "🏦 FinGPT (TGI):       ${GREEN}http://localhost:8080${NC}"
    echo -e "🗄️  PostgreSQL:        ${GREEN}localhost:5432${NC}"
    echo -e "📊 RabbitMQ Management: ${GREEN}http://localhost:15672${NC} (vili/vili_password)"
    echo ""
    echo "Команды управления:"
    echo "  make stop              - остановить все сервисы"
    echo "  make status            - статус системы"
    echo "  make logs              - просмотр всех логов"
    echo "  make logs-backend      - логи backend"
    echo "  make logs-ollama       - логи Ollama cluster"
    echo "  make logs-litellm      - логи LiteLLM"
    echo "  make logs-tgi          - логи FinGPT (TGI)"
    echo ""
    echo "Загрузка дополнительных моделей:"
    echo "  make ollama-models     - список установленных моделей"
    echo "  make ollama-pull-model - загрузить модель (MODEL=<name>)"
    echo "  make ollama-pull-popular - загрузить популярные модели"
    echo ""
    echo "  make help              - все команды"
    echo ""
    echo -e "${CYAN}💡 VILI Payment Assistant готов к обработке платежей!${NC}"
}

# =====================================================
# MAIN
# =====================================================

header "VILI PAYMENT ASSISTANT"

check_docker
check_updates
start_services
show_status
show_info
