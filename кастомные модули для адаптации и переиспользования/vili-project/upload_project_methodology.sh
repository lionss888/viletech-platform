#!/bin/bash
# Скрипт для загрузки методологии управления проектами в базу знаний VILI
# 
# Использование:
#   ./upload_project_methodology.sh [API_URL] [API_TOKEN]
#
# Примеры:
#   ./upload_project_methodology.sh
#   ./upload_project_methodology.sh http://localhost:8000 mock-token

API_URL="${1:-http://localhost:8000}"
API_TOKEN="${2:-mock-token}"

echo "=== Загрузка методологии управления проектами ==="
echo "API URL: $API_URL"
echo ""

# Проверяем наличие файла
if [ ! -f "UprPOjct.pdf" ]; then
    echo "Ошибка: файл UprPOjct.pdf не найден в текущей директории"
    exit 1
fi

# Загружаем файл
echo "Загрузка UprPOjct.pdf..."
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/knowledge_sources/upload" \
    -H "Authorization: Bearer $API_TOKEN" \
    -F "name=Методология управления проектами" \
    -F "description=Руководство по управлению проектами для бизнеса. Включает методологии, этапы проекта, инструменты планирования." \
    -F "category=project_management" \
    -F "owner_only=true" \
    -F "file=@UprPOjct.pdf")

# Разделяем ответ и HTTP код
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ]; then
    echo ""
    echo "Успех! Файл загружен."
    echo ""
    echo "Ответ сервера:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    echo "Теперь ассистент VILI может отвечать на вопросы по управлению проектами!"
    echo ""
    echo "Примеры запросов:"
    echo "  - Как спланировать проект?"
    echo "  - Что такое Scrum?"
    echo "  - Какие этапы есть в проекте?"
    echo "  - Как управлять рисками проекта?"
else
    echo ""
    echo "Ошибка при загрузке (HTTP $http_code):"
    echo "$body"
    exit 1
fi
