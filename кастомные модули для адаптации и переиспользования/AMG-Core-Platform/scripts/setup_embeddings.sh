#!/bin/bash

# Setup embeddings model for Ollama
# Usage: ./scripts/setup_embeddings.sh [OLLAMA_HOST]

set -e

OLLAMA_HOST=${1:-"http://localhost:11434"}

echo "🚀 Setting up embeddings model for Ollama..."

# Check if Ollama is running
if ! curl -s "$OLLAMA_HOST/api/tags" > /dev/null; then
    echo "❌ Ollama is not running at $OLLAMA_HOST"
    echo "Please start Ollama first: docker compose up ollama"
    exit 1
fi

# List of embedding models to try (in order of preference)
EMBEDDING_MODELS=(
    "nomic-embed-text"
    "mxbai-embed-large"
    "all-minilm"
)

echo "📥 Installing embedding models..."

for model in "${EMBEDDING_MODELS[@]}"; do
    echo "📥 Pulling $model..."
    
    if command -v docker &> /dev/null; then
        # Try to pull the model
        if docker exec ollama ollama pull "$model" 2>/dev/null; then
            echo "✅ $model pulled successfully"
            
            # Test the model
            echo "🧪 Testing $model..."
            if curl -s -X POST "$OLLAMA_HOST/api/embeddings" \
                -H "Content-Type: application/json" \
                -d "{\"model\": \"$model\", \"prompt\": \"test embedding\"}" \
                | grep -q "embedding"; then
                echo "✅ $model is working correctly"
                echo "🎉 Embeddings setup complete! Using model: $model"
                exit 0
            else
                echo "⚠️  $model pulled but test failed"
            fi
        else
            echo "❌ Failed to pull $model"
        fi
    else
        echo "❌ Docker not found. Please install Ollama and pull the model manually:"
        echo "   ollama pull $model"
        continue
    fi
done

echo "❌ No working embedding models found"
echo "Please check Ollama logs and try manually:"
echo "   ollama pull nomic-embed-text"
echo "   curl -X POST $OLLAMA_HOST/api/embeddings -d '{\"model\": \"nomic-embed-text\", \"prompt\": \"test\"}'"

exit 1
