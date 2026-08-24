#!/bin/bash

# Ensure Ollama is running and accessible
# Usage: ./scripts/ensure_ollama.sh [OLLAMA_HOST] [OLLAMA_MODEL]

set -e

OLLAMA_HOST=${1:-"http://localhost:11434"}
OLLAMA_MODEL=${2:-"llama3.2:3b-instruct-q4_0"}

echo "🔍 Checking Ollama at $OLLAMA_HOST..."

# Check if Ollama is running
if ! curl -s "$OLLAMA_HOST/api/tags" > /dev/null; then
    echo "❌ Ollama is not running at $OLLAMA_HOST"
    echo "💡 Start Ollama with: docker run -d -p 11434:11434 -v ollama:/root/.ollama --name ollama ollama/ollama"
    exit 1
fi

echo "✅ Ollama is running"

# Check if model is available
if ! curl -s "$OLLAMA_HOST/api/tags" | grep -q "$OLLAMA_MODEL"; then
    echo "📥 Model $OLLAMA_MODEL not found, pulling..."
    
    # Pull the model
    if command -v docker &> /dev/null; then
        docker exec ollama ollama pull "$OLLAMA_MODEL"
    else
        echo "❌ Docker not found. Please install Ollama and pull the model manually:"
        echo "   ollama pull $OLLAMA_MODEL"
        exit 1
    fi
fi

echo "✅ Model $OLLAMA_MODEL is available"

# Test the model
echo "🧪 Testing model..."
if curl -s -X POST "$OLLAMA_HOST/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$OLLAMA_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"stream\":false}" \
    | grep -q "message"; then
    echo "✅ Model is working correctly"
else
    echo "❌ Model test failed"
    exit 1
fi

echo "🎉 Ollama is ready!"