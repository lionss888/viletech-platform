#!/bin/bash

echo "🔍 БЫСТРАЯ ПРОВЕРКА СОСТОЯНИЯ AMG"
echo "=================================="

# Проверка Docker
echo "🐳 Проверка Docker..."
if docker --version > /dev/null 2>&1; then
    echo "✅ Docker доступен"
else
    echo "❌ Docker недоступен"
    exit 1
fi

# Проверка контейнеров
echo -e "\n📦 Проверка контейнеров..."
if docker-compose ps > /dev/null 2>&1; then
    echo "✅ docker-compose работает"
    
    # Показываем статус контейнеров
    echo -e "\n📊 Статус контейнеров:"
    docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ docker-compose не работает"
fi

# Проверка портов
echo -e "\n🌐 Проверка доступности сервисов..."

# PostgreSQL
if nc -z localhost 5432 2>/dev/null; then
    echo "✅ PostgreSQL (порт 5432) - доступен"
else
    echo "❌ PostgreSQL (порт 5432) - недоступен"
fi

# pgAdmin
if nc -z localhost 5050 2>/dev/null; then
    echo "✅ pgAdmin (порт 5050) - доступен"
else
    echo "❌ pgAdmin (порт 5050) - недоступен"
fi

# Ollama
if nc -z localhost 11434 2>/dev/null; then
    echo "✅ Ollama (порт 11434) - доступен"
else
    echo "❌ Ollama (порт 11434) - недоступен"
fi

# Dashboard
if nc -z localhost 8502 2>/dev/null; then
    echo "✅ Dashboard (порт 8502) - доступен"
else
    echo "❌ Dashboard (порт 8502) - недоступен"
fi

# Проверка Ollama API
echo -e "\n🤖 Проверка Ollama API..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama API отвечает"
    
    # Проверяем модели
    models=$(curl -s http://localhost:11434/api/tags | jq -r '.models | length' 2>/dev/null || echo "0")
    echo "📚 Доступно моделей: $models"
else
    echo "❌ Ollama API не отвечает"
fi

# Проверка логов
echo -e "\n📋 Последние логи контейнеров:"
echo "PostgreSQL:"
docker logs --tail 3 abs_postgres 2>/dev/null || echo "Контейнер не найден"

echo -e "\nOllama:"
docker logs --tail 3 abs_ollama 2>/dev/null || echo "Контейнер не найден"

echo -e "\nDashboard:"
docker logs --tail 3 abs_dashboard 2>/dev/null || echo "Контейнер не найден"

echo -e "\n✅ Проверка завершена!"
echo "Для детального мониторинга запустите: python scripts/monitor/health_check.py"
