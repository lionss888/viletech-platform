#!/bin/bash

# AMG BDUI System Restore Script
# Восстановление системы из резервной копии

set -e

BACKUP_DIR="./backups"

echo "🔄 AMG BDUI System Restore"
echo "=========================="

# Проверка наличия бэкапов
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
    echo "❌ Директория с бэкапами пуста или не существует"
    exit 1
fi

# Показать доступные бэкапы
echo "📁 Доступные бэкапы:"
ls -la "$BACKUP_DIR"/*.tar.gz | nl

# Запрос выбора бэкапа
read -p "Введите номер бэкапа для восстановления: " backup_num

# Получение имени файла бэкапа
backup_file=$(ls "$BACKUP_DIR"/*.tar.gz | sed -n "${backup_num}p")

if [ -z "$backup_file" ]; then
    echo "❌ Неверный номер бэкапа"
    exit 1
fi

echo "🔄 Восстановление из: $backup_file"

# Остановка системы
echo "⏹️ Остановка системы..."
docker-compose down

# Создание временной директории
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Распаковка бэкапа
echo "📦 Распаковка бэкапа..."
tar -xzf "$backup_file"

# Восстановление базы данных
if [ -f "amg_bdui_backup_*_database.sql" ]; then
    echo "📊 Восстановление базы данных..."
    docker-compose up -d postgres
    sleep 10
    docker-compose exec -T postgres psql -U amg_user -d amg_bdui < amg_bdui_backup_*_database.sql
fi

# Восстановление конфигураций
if [ -f "amg_bdui_backup_*_configs.tar.gz" ]; then
    echo "⚙️ Восстановление конфигураций..."
    tar -xzf amg_bdui_backup_*_configs.tar.gz
    cp -r * ../../ 2>/dev/null || true
fi

# Восстановление UI схем
if [ -f "amg_bdui_backup_*_ui_schemas.tar.gz" ]; then
    echo "🎨 Восстановление UI схем..."
    tar -xzf amg_bdui_backup_*_ui_schemas.tar.gz
    cp -r * ../../ 2>/dev/null || true
fi

# Очистка временной директории
cd ../..
rm -rf "$TEMP_DIR"

# Запуск системы
echo "🚀 Запуск системы..."
docker-compose up -d

echo "✅ Восстановление завершено!"
