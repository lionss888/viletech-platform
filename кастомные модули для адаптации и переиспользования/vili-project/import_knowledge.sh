#!/bin/bash
# Скрипт для импорта PDF файлов в базу знаний VILI

API_URL="http://localhost:8000"
TOKEN="mock-token"

echo "Импорт знаний в VILI..."
echo ""

# Импорт методологии управления проектами
echo "1. Загрузка методологии управления проектами (UprPOjct.pdf)..."
curl -X POST "${API_URL}/api/v1/knowledge-sources/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "name=Методология управления проектами" \
  -F "category=project_management" \
  -F "owner_only=true" \
  -F "description=Руководство по управлению проектами для бизнеса" \
  -F "file=@UprPOjct.pdf" \
  --max-time 600 \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | tail -20

echo ""
echo ""

# Импорт ВЭД
echo "2. Загрузка методологии ВЭД (VED task.pdf)..."
curl -X POST "${API_URL}/api/v1/knowledge-sources/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "name=Методология ВЭД" \
  -F "category=ved" \
  -F "owner_only=false" \
  -F "description=Академические знания и методология по внешнеэкономической деятельности" \
  -F "file=@VED task.pdf" \
  --max-time 600 \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | tail -20

echo ""
echo "Импорт завершен!"
