#!/bin/bash

# =====================================================
# VILI Payment Assistant - Остановка сервисов
# =====================================================

set -e

echo "🛑 Остановка VILI сервисов..."

docker compose down

echo ""
echo "✅ Все сервисы остановлены"
echo ""
echo "💡 Данные сохранены в Docker volumes:"
echo "   - vili_model_data (Ollama модели)"
echo "   - vili_tgi_models (FinGPT модели)"
echo "   - vili_postgres_data (база данных)"
echo "   - vili_redis_data (кэш)"
echo "   - vili_rabbitmq_data (очереди)"
echo ""
echo "Для полного удаления данных:"
echo "   docker compose down -v"
echo ""
echo "Для пересборки backend:"
echo "   docker compose build backend"
