#!/bin/bash

# Pull and setup models for Ollama
# Usage: ./scripts/model_pull.sh [OLLAMA_HOST]

set -e

OLLAMA_HOST=${1:-"http://localhost:11434"}

echo "🚀 Setting up Ollama models..."

# Check if Ollama is running
if ! curl -s "$OLLAMA_HOST/api/tags" > /dev/null; then
    echo "❌ Ollama is not running at $OLLAMA_HOST"
    exit 1
fi

# List of models to pull (optimized versions)
MODELS=(
    "llama3.2:3b-instruct-q4_0"
    "codellama:7b-instruct-q4_0"
    "mistral:7b-instruct-q4_0"
)

for model in "${MODELS[@]}"; do
    echo "📥 Pulling $model..."
    
    if command -v docker &> /dev/null; then
        docker exec ollama ollama pull "$model"
    else
        echo "❌ Docker not found. Please install Ollama and pull the model manually:"
        echo "   ollama pull $model"
        continue
    fi
    
    echo "✅ $model pulled successfully"
done

echo "🎉 All models are ready!"

# Show available models
echo "📋 Available models:"
curl -s "$OLLAMA_HOST/api/tags" | jq -r '.models[] | "  - \(.name) (\(.size | . / 1024 / 1024 / 1024 | floor)GB)"'