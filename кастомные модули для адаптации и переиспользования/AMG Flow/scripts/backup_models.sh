#!/bin/bash

# Простой скрипт для бэкапа моделей Ollama

echo "🔄 Создаем бэкап моделей Ollama..."

# Создаем директорию для бэкапа
mkdir -p models/backup

# Получаем список моделей
echo "📋 Список доступных моделей:"
docker compose exec ollama ollama list

# Создаем файл со списком моделей
docker compose exec ollama ollama list > models/backup/models_list.txt

echo "✅ Бэкап создан в папке models/backup/"
echo "📁 Список моделей сохранен в models/backup/models_list.txt"
echo ""
echo "Для восстановления моделей используйте:"
echo "  docker compose exec ollama ollama pull <model_name>"
