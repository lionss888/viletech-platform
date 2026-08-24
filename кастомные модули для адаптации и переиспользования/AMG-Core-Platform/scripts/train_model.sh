#!/bin/bash

# Script for training models on conversation data
# Usage: ./scripts/train_model.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CONVO_ID=""
BASE_MODEL="llama3.2:3b-instruct-q4_0"
NEW_MODEL_NAME="amg-flow-custom"
EPOCHS=3
LEARNING_RATE=0.0001
BACKGROUND=true
EXPORT_ONLY=false

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

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -c, --convo-id ID        Train on specific conversation ID"
    echo "  -b, --base-model MODEL   Base model to use (default: llama3.2:3b-instruct-q4_0)"
    echo "  -n, --new-model NAME     Name for new model (default: amg-flow-custom)"
    echo "  -e, --epochs NUM         Number of epochs (default: 3)"
    echo "  -l, --learning-rate NUM  Learning rate (default: 0.0001)"
    echo "  -f, --foreground         Run training in foreground"
    echo "  -x, --export-only        Only export training data, don't train"
    echo "  -h, --help               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Train on all conversations"
    echo "  $0 -c chat-123                       # Train on specific conversation"
    echo "  $0 -n my-custom-model -e 5           # Custom model name and epochs"
    echo "  $0 -x                                # Export training data only"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--convo-id)
            CONVO_ID="$2"
            shift 2
            ;;
        -b|--base-model)
            BASE_MODEL="$2"
            shift 2
            ;;
        -n|--new-model)
            NEW_MODEL_NAME="$2"
            shift 2
            ;;
        -e|--epochs)
            EPOCHS="$2"
            shift 2
            ;;
        -l|--learning-rate)
            LEARNING_RATE="$2"
            shift 2
            ;;
        -f|--foreground)
            BACKGROUND=false
            shift
            ;;
        -x|--export-only)
            EXPORT_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Check if API is running
log "Checking if API is running..."
if ! curl -s http://localhost:8000/v1/health > /dev/null; then
    error "API is not running. Please start it first with 'make dev' or 'docker compose up'"
fi

# Check if Ollama is running
log "Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    error "Ollama is not running. Please start it first"
fi

# Export training data
if [ "$EXPORT_ONLY" = true ]; then
    log "Exporting training data..."
    
    if [ -n "$CONVO_ID" ]; then
        curl -X POST "http://localhost:8000/v1/learning/training/export?convo_id=$CONVO_ID" \
             -H "Content-Type: application/json"
    else
        curl -X POST "http://localhost:8000/v1/learning/training/export" \
             -H "Content-Type: application/json"
    fi
    
    success "Training data exported"
    exit 0
fi

# Prepare training request
TRAINING_REQUEST=$(cat <<EOF
{
    "convo_id": "$CONVO_ID",
    "base_model": "$BASE_MODEL",
    "new_model_name": "$NEW_MODEL_NAME",
    "epochs": $EPOCHS,
    "learning_rate": $LEARNING_RATE,
    "background": $BACKGROUND
}
EOF
)

# Start training
log "Starting model training..."
log "Base model: $BASE_MODEL"
log "New model: $NEW_MODEL_NAME"
log "Epochs: $EPOCHS"
log "Learning rate: $LEARNING_RATE"
log "Background: $BACKGROUND"

if [ -n "$CONVO_ID" ]; then
    log "Training on conversation: $CONVO_ID"
else
    log "Training on all conversations"
fi

# Send training request
RESPONSE=$(curl -s -X POST "http://localhost:8000/v1/learning/training/train" \
    -H "Content-Type: application/json" \
    -d "$TRAINING_REQUEST")

# Check response
if echo "$RESPONSE" | grep -q '"status": "started"'; then
    success "Training started successfully"
    echo "Response: $RESPONSE"
    
    if [ "$BACKGROUND" = true ]; then
        log "Training is running in background. Check logs with:"
        echo "  docker compose logs -f api"
        echo ""
        log "To check training status, use:"
        echo "  curl http://localhost:8000/v1/learning/models"
    fi
elif echo "$RESPONSE" | grep -q '"status": "completed"'; then
    success "Training completed successfully"
    echo "Response: $RESPONSE"
else
    error "Training failed: $RESPONSE"
fi

# Show available models
log "Available models:"
curl -s http://localhost:8000/v1/learning/models | jq -r '.models[] | "  - \(.name)"'

success "Script completed"
