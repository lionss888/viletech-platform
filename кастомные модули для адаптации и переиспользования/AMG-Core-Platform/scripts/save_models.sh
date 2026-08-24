#!/bin/bash

# Скрипт для сохранения моделей Ollama локально
# Модели будут сохранены в папку models/ для повторного использования

set -e

echo "🔄 Сохраняем модели Ollama локально..."

# Создаем директорию для моделей
mkdir -p models

# Получаем список моделей
echo "📋 Получаем список моделей..."
docker compose exec ollama ollama list > models/ollama_models.txt

echo "📦 Сохраняем модели в локальную папку..."

# Список моделей для сохранения
MODELS=(
    "llama3.2:3b-instruct-q4_0"
    "codellama:7b-instruct-q4_0" 
    "mistral:7b-instruct-q4_0"
)

# Создаем архив с моделями
echo "🗜️ Создаем архив с моделями..."
docker compose exec ollama tar -czf /tmp/ollama_models.tar.gz -C /root/.ollama .

# Копируем архив на хост
echo "💾 Копируем модели на хост..."
docker cp amgflow-ollama-1:/tmp/ollama_models.tar.gz models/

# Создаем скрипт для восстановления
cat > models/restore_models.sh << 'EOF'
#!/bin/bash
# Скрипт для восстановления моделей из архива

echo "🔄 Восстанавливаем модели Ollama..."

# Копируем архив в контейнер
docker cp ollama_models.tar.gz amgflow-ollama-1:/tmp/

# Распаковываем модели
docker compose exec ollama tar -xzf /tmp/ollama_models.tar.gz -C /root/.ollama

# Перезапускаем Ollama для загрузки моделей
docker compose restart ollama

echo "✅ Модели восстановлены!"
EOF

chmod +x models/restore_models.sh

echo "✅ Модели сохранены в папку models/"
echo "📁 Размер архива: $(du -h models/ollama_models.tar.gz | cut -f1)"
echo ""
echo "Для восстановления моделей запустите:"
echo "  cd models && ./restore_models.sh"
