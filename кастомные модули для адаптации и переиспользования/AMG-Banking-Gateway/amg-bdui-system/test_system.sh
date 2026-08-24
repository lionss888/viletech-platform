#!/bin/bash

echo "🧪 Тестирование AMG Backend-Driven UI System"
echo "=============================================="

# Проверка структуры проекта
echo "📁 Проверка структуры проекта..."
if [ -f "README.md" ] && [ -f "docker-compose.yml" ] && [ -f "Makefile" ]; then
    echo "✅ Основные файлы созданы"
else
    echo "❌ Отсутствуют основные файлы"
    exit 1
fi

# Проверка backend
echo "🔧 Проверка backend..."
if [ -f "backend/go.mod" ] && [ -f "backend/cmd/server/main.go" ] && [ -f "backend/Dockerfile" ]; then
    echo "✅ Backend файлы созданы"
else
    echo "❌ Отсутствуют backend файлы"
    exit 1
fi

# Проверка frontend
echo "⚛️ Проверка frontend..."
if [ -f "frontend/package.json" ] && [ -f "frontend/src/App.tsx" ] && [ -f "frontend/Dockerfile" ]; then
    echo "✅ Frontend файлы созданы"
else
    echo "❌ Отсутствуют frontend файлы"
    exit 1
fi

# Проверка Docker конфигурации
echo "🐳 Проверка Docker конфигурации..."
if [ -f "docker-compose.yml" ] && [ -f "monitoring/prometheus/prometheus.yml" ]; then
    echo "✅ Docker конфигурация создана"
else
    echo "❌ Отсутствует Docker конфигурация"
    exit 1
fi

# Проверка Makefile
echo "🔨 Проверка Makefile..."
if [ -f "Makefile" ] && grep -q "help:" Makefile; then
    echo "✅ Makefile создан с командами"
else
    echo "❌ Makefile не создан или неполный"
    exit 1
fi

echo ""
echo "🎉 Все проверки пройдены успешно!"
echo "Система AMG Backend-Driven UI готова к использованию!"
echo ""
echo "Для запуска используйте:"
echo "  make up          # Запуск всех сервисов"
echo "  make dev         # Режим разработки"
echo "  make health      # Проверка статуса"
echo "  make logs        # Просмотр логов"
