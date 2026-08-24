#!/bin/bash

# AMG BDUI System Backup Script
# Создание резервных копий системы

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="amg_bdui_backup_${TIMESTAMP}"

echo "💾 AMG BDUI System Backup"
echo "========================="

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

# Бэкап базы данных
echo "📊 Создание бэкапа базы данных..."
docker-compose exec -T postgres pg_dump -U amg_user amg_bdui > "${BACKUP_DIR}/${BACKUP_NAME}_database.sql"

# Бэкап конфигураций
echo "⚙️ Создание бэкапа конфигураций..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_configs.tar.gz" \
    docker-compose.yml \
    .env \
    backend/configs/ \
    frontend/configs/ \
    monitoring/

# Бэкап UI схем
echo "🎨 Создание бэкапа UI схем..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_ui_schemas.tar.gz" \
    backend/internal/ui/schemas/

# Создание архива всех бэкапов
echo "📦 Создание общего архива..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_full.tar.gz" \
    "${BACKUP_DIR}/${BACKUP_NAME}_database.sql" \
    "${BACKUP_DIR}/${BACKUP_NAME}_configs.tar.gz" \
    "${BACKUP_DIR}/${BACKUP_NAME}_ui_schemas.tar.gz"

# Очистка временных файлов
rm "${BACKUP_DIR}/${BACKUP_NAME}_database.sql"
rm "${BACKUP_DIR}/${BACKUP_NAME}_configs.tar.gz"
rm "${BACKUP_DIR}/${BACKUP_NAME}_ui_schemas.tar.gz"

echo "✅ Бэкап создан: ${BACKUP_DIR}/${BACKUP_NAME}_full.tar.gz"
echo "📁 Размер: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}_full.tar.gz" | cut -f1)"
