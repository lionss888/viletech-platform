#!/bin/bash

# Monitoring script for Ollama BP Automation
# Usage: ./scripts/monitor.sh [start|stop|status|logs]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LOG_FILE="monitor.log"
PID_FILE="monitor.pid"
CHECK_INTERVAL=30
HEALTH_URL="http://localhost:8000/health"
API_URL="http://localhost:8000/v1/health"
OLLAMA_URL="http://localhost:8000/v1/health/ollama"
DB_URL="http://localhost:8000/v1/health/db"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

check_service() {
    local url=$1
    local service_name=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        success "$service_name is healthy"
        return 0
    else
        error "$service_name is not responding"
        return 1
    fi
}

check_all_services() {
    local all_healthy=true
    
    log "Checking all services..."
    
    # Check load balancer
    if ! check_service "$HEALTH_URL" "Load Balancer"; then
        all_healthy=false
    fi
    
    # Check API
    if ! check_service "$API_URL" "API Server"; then
        all_healthy=false
    fi
    
    # Check Ollama
    if ! check_service "$OLLAMA_URL" "Ollama Service"; then
        all_healthy=false
    fi
    
    # Check Database
    if ! check_service "$DB_URL" "Database"; then
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        success "All services are healthy"
    else
        error "Some services are not healthy"
    fi
    
    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

monitor_loop() {
    log "Starting monitoring loop (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        if ! check_all_services; then
            warning "Health check failed, will retry in ${CHECK_INTERVAL}s"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

start_monitoring() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            warning "Monitoring is already running (PID: $pid)"
            return 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    log "Starting monitoring service..."
    monitor_loop &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    success "Monitoring started (PID: $pid)"
}

stop_monitoring() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            rm -f "$PID_FILE"
            success "Monitoring stopped"
        else
            warning "Monitoring is not running"
            rm -f "$PID_FILE"
        fi
    else
        warning "No PID file found"
    fi
}

show_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            success "Monitoring is running (PID: $pid)"
        else
            warning "PID file exists but process is not running"
            rm -f "$PID_FILE"
        fi
    else
        warning "Monitoring is not running"
    fi
    
    echo ""
    check_all_services
}

show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "=== Monitoring Logs ==="
        tail -n 50 "$LOG_FILE"
    else
        warning "No log file found"
    fi
}

show_help() {
    echo "Usage: $0 [start|stop|status|logs|check]"
    echo ""
    echo "Commands:"
    echo "  start   - Start monitoring service"
    echo "  stop    - Stop monitoring service"
    echo "  status  - Show monitoring status and health"
    echo "  logs    - Show recent logs"
    echo "  check   - Run single health check"
    echo "  help    - Show this help"
}

# Main script
case "${1:-help}" in
    "start")
        start_monitoring
        ;;
    "stop")
        stop_monitoring
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "check")
        check_all_services
        ;;
    "help"|*)
        show_help
        ;;
esac
