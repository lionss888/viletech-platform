#!/bin/bash

# Blue-Green Deployment Script for Ollama BP Automation
# Usage: ./scripts/deploy.sh [blue|green|switch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.blue-green.yml"
NGINX_CONF="nginx/nginx.conf"
HEALTH_CHECK_URL="http://localhost:8000/health"
API_BLUE_URL="http://api-blue:8000/v1/health"
API_GREEN_URL="http://api-green:8000/v1/health"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

check_health() {
    local url=$1
    local service_name=$2
    
    log "Checking health of $service_name..."
    
    if curl -s -f "$url" > /dev/null; then
        success "$service_name is healthy"
        return 0
    else
        error "$service_name is not healthy"
        return 1
    fi
}

wait_for_health() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $service_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null; then
            success "$service_name is healthy after $attempt attempts"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts - waiting 10s..."
        sleep 10
        ((attempt++))
    done
    
    error "$service_name failed to become healthy after $max_attempts attempts"
}

deploy_blue() {
    log "Deploying Blue version..."
    
    # Build and start blue API
    docker compose -f $COMPOSE_FILE build api-blue
    docker compose -f $COMPOSE_FILE up -d api-blue
    
    # Wait for health check
    wait_for_health "$API_BLUE_URL" "Blue API"
    
    # Update nginx to use blue as primary
    update_nginx_config "blue"
    
    success "Blue deployment completed"
}

deploy_green() {
    log "Deploying Green version..."
    
    # Build and start green API
    docker compose -f $COMPOSE_FILE build api-green
    docker compose -f $COMPOSE_FILE --profile green up -d api-green
    
    # Wait for health check
    wait_for_health "$API_GREEN_URL" "Green API"
    
    success "Green deployment completed"
}

switch_to_green() {
    log "Switching to Green version..."
    
    # Check if green is healthy
    check_health "$API_GREEN_URL" "Green API"
    
    # Update nginx to use green as primary
    update_nginx_config "green"
    
    # Reload nginx
    docker compose -f $COMPOSE_FILE exec nginx nginx -s reload
    
    success "Switched to Green version"
}

switch_to_blue() {
    log "Switching to Blue version..."
    
    # Check if blue is healthy
    check_health "$API_BLUE_URL" "Blue API"
    
    # Update nginx to use blue as primary
    update_nginx_config "blue"
    
    # Reload nginx
    docker compose -f $COMPOSE_FILE exec nginx nginx -s reload
    
    success "Switched to Blue version"
}

update_nginx_config() {
    local primary=$1
    
    log "Updating nginx configuration to use $primary as primary..."
    
    if [ "$primary" = "blue" ]; then
        # Blue as primary, green as backup
        sed -i 's/server api-blue:8000 max_fails=3 fail_timeout=30s;/server api-blue:8000 max_fails=3 fail_timeout=30s;/' $NGINX_CONF
        sed -i 's/server api-green:8000 max_fails=3 fail_timeout=30s backup;/server api-green:8000 max_fails=3 fail_timeout=30s backup;/' $NGINX_CONF
    else
        # Green as primary, blue as backup
        sed -i 's/server api-blue:8000 max_fails=3 fail_timeout=30s;/server api-blue:8000 max_fails=3 fail_timeout=30s backup;/' $NGINX_CONF
        sed -i 's/server api-green:8000 max_fails=3 fail_timeout=30s backup;/server api-green:8000 max_fails=3 fail_timeout=30s;/' $NGINX_CONF
    fi
}

rollback() {
    log "Rolling back to previous version..."
    
    # Check which version is currently active
    if curl -s -f "$API_BLUE_URL" > /dev/null; then
        switch_to_blue
    elif curl -s -f "$API_GREEN_URL" > /dev/null; then
        switch_to_green
    else
        error "No healthy version found for rollback"
    fi
}

status() {
    log "Checking deployment status..."
    
    echo "=== Blue API Status ==="
    if curl -s -f "$API_BLUE_URL" > /dev/null; then
        success "Blue API is healthy"
    else
        warning "Blue API is not healthy"
    fi
    
    echo "=== Green API Status ==="
    if curl -s -f "$API_GREEN_URL" > /dev/null; then
        success "Green API is healthy"
    else
        warning "Green API is not healthy"
    fi
    
    echo "=== Load Balancer Status ==="
    if curl -s -f "$HEALTH_CHECK_URL" > /dev/null; then
        success "Load balancer is healthy"
    else
        warning "Load balancer is not healthy"
    fi
}

# Main script
case "${1:-help}" in
    "blue")
        deploy_blue
        ;;
    "green")
        deploy_green
        ;;
    "switch")
        if [ "${2:-}" = "green" ]; then
            switch_to_green
        elif [ "${2:-}" = "blue" ]; then
            switch_to_blue
        else
            error "Usage: $0 switch [blue|green]"
        fi
        ;;
    "rollback")
        rollback
        ;;
    "status")
        status
        ;;
    "help"|*)
        echo "Usage: $0 [blue|green|switch|rollback|status]"
        echo ""
        echo "Commands:"
        echo "  blue     - Deploy blue version"
        echo "  green    - Deploy green version"
        echo "  switch   - Switch between blue/green"
        echo "  rollback - Rollback to previous version"
        echo "  status   - Check deployment status"
        echo "  help     - Show this help"
        ;;
esac
