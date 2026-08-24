#!/bin/bash

# Script to test all analytics endpoints
# Usage: ./scripts/test_analytics_endpoints.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:8000"
TIMEOUT=10

# Functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local method="${3:-GET}"
    
    log "Testing $description..."
    
    if curl -s --max-time $TIMEOUT -X "$method" "$API_BASE_URL$endpoint" > /dev/null 2>&1; then
        success "$description - OK"
        return 0
    else
        error "$description - FAILED"
        return 1
    fi
}

test_endpoint_with_data() {
    local endpoint="$1"
    local description="$2"
    local data="$3"
    local method="${4:-POST}"
    
    log "Testing $description..."
    
    if curl -s --max-time $TIMEOUT -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_BASE_URL$endpoint" > /dev/null 2>&1; then
        success "$description - OK"
        return 0
    else
        error "$description - FAILED"
        return 1
    fi
}

show_response() {
    local endpoint="$1"
    local description="$2"
    
    log "Getting response for $description..."
    echo "--- Response for $description ---"
    curl -s --max-time $TIMEOUT "$API_BASE_URL$endpoint" | python3 -m json.tool 2>/dev/null || curl -s --max-time $TIMEOUT "$API_BASE_URL$endpoint"
    echo ""
}

# Main execution
log "🎯 AMG Flow Analytics Endpoints Test"
echo "=================================="

# Check if API is running
log "Checking if API is running..."
if ! curl -s --max-time 5 "$API_BASE_URL/v1/health" > /dev/null 2>&1; then
    error "API is not running at $API_BASE_URL"
    echo "Please start the API with: docker compose up -d"
    exit 1
fi
success "API is running"

echo ""

# Test basic health endpoints
log "Testing basic health endpoints..."
test_endpoint "/v1/health" "Health check"
test_endpoint "/v1/analytics/health" "Analytics health check"

echo ""

# Test analytics endpoints
log "Testing analytics endpoints..."

# Daily analytics
test_endpoint "/v1/analytics/daily" "Daily analytics"
test_endpoint "/v1/analytics/daily?days=7" "Daily analytics (7 days)"
test_endpoint "/v1/analytics/daily?days=30" "Daily analytics (30 days)"

# User analytics
test_endpoint "/v1/analytics/users" "User analytics"
test_endpoint "/v1/analytics/users?limit=10" "User analytics (limited)"

# Conversation analytics
test_endpoint "/v1/analytics/conversations" "Conversation analytics"
test_endpoint "/v1/analytics/conversations?limit=10" "Conversation analytics (limited)"

# Interaction analytics
test_endpoint "/v1/analytics/interactions" "Interaction analytics"
test_endpoint "/v1/analytics/interactions?limit=10" "Interaction analytics (limited)"

echo ""

# Test data creation endpoints
log "Testing data creation endpoints..."

# Create test session
SESSION_DATA='{
    "user_id": "test_user_123",
    "started_at": "2025-01-01T10:00:00Z",
    "ended_at": "2025-01-01T12:00:00Z",
    "is_active": false,
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Test Browser)",
    "device_type": "desktop",
    "browser": "chrome",
    "os": "linux"
}'

test_endpoint_with_data "/v1/analytics/sessions" "Create user session" "$SESSION_DATA"

# Create test conversation metrics
CONVERSATION_DATA='{
    "session_id": "test_session_123",
    "conversation_id": "test_conversation_123",
    "started_at": "2025-01-01T10:30:00Z",
    "ended_at": "2025-01-01T11:30:00Z",
    "total_messages": 20,
    "user_messages": 10,
    "assistant_messages": 10,
    "total_duration_seconds": 3600,
    "avg_response_time_ms": 1500,
    "model_used": "llama3.2:3b-instruct-q4_0",
    "rag_used": true,
    "tools_used": 2,
    "errors_count": 0,
    "satisfaction_score": 4
}'

test_endpoint_with_data "/v1/analytics/conversations" "Create conversation metrics" "$CONVERSATION_DATA"

# Create test user interaction
INTERACTION_DATA='{
    "session_id": "test_session_123",
    "conversation_id": "test_conversation_123",
    "interaction_type": "message_sent",
    "timestamp": "2025-01-01T10:35:00Z",
    "user_id": "test_user_123",
    "model_used": "llama3.2:3b-instruct-q4_0",
    "response_time_ms": 1200,
    "success": true,
    "error_message": null,
    "metadata": {
        "message_content": "Test message",
        "message_length": 12,
        "language": "en"
    }
}'

test_endpoint_with_data "/v1/analytics/interactions" "Create user interaction" "$INTERACTION_DATA"

echo ""

# Show sample responses
log "Showing sample responses..."

show_response "/v1/analytics/daily" "Daily Analytics"
show_response "/v1/analytics/users?limit=5" "User Analytics (5 users)"
show_response "/v1/analytics/conversations?limit=3" "Conversation Analytics (3 conversations)"
show_response "/v1/analytics/interactions?limit=5" "Interaction Analytics (5 interactions)"

echo ""

# Test error handling
log "Testing error handling..."

# Test invalid endpoint
log "Testing invalid endpoint..."
if curl -s --max-time $TIMEOUT "$API_BASE_URL/v1/analytics/invalid" > /dev/null 2>&1; then
    warning "Invalid endpoint should return 404"
else
    success "Invalid endpoint correctly returns error"
fi

# Test invalid data
log "Testing invalid data..."
INVALID_DATA='{"invalid": "data"}'
if curl -s --max-time $TIMEOUT -X POST \
    -H "Content-Type: application/json" \
    -d "$INVALID_DATA" \
    "$API_BASE_URL/v1/analytics/sessions" > /dev/null 2>&1; then
    warning "Invalid data should return validation error"
else
    success "Invalid data correctly returns validation error"
fi

echo ""

# Performance test
log "Testing performance..."

log "Testing response times..."
for i in {1..5}; do
    start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "$API_BASE_URL/v1/analytics/daily" > /dev/null 2>&1
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))
    log "Request $i: ${duration}ms"
done

echo ""

# Summary
log "Test completed!"
echo "=============="
success "All tests completed successfully"

echo ""
echo "Next steps:"
echo "1. Open the web UI: file://$(pwd)/scripts/test_analytics_ui.html"
echo "2. Generate test data: python3 scripts/generate_test_analytics.py"
echo "3. View analytics in the main app: http://localhost:5173"
echo ""

log "Happy testing! 🎉"
