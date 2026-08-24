#!/bin/bash

# Скрипт для backup PostgreSQL базы данных
# Автор: AMG Flow Team
# Версия: 1.0

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
BACKUP_DIR="backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="appdb"
DB_USER="user"
DB_HOST="localhost"
DB_PORT="5432"

# Создаем директорию для backup
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Создаем backup базы данных...${NC}"
echo -e "${YELLOW}📅 Время: $(date)${NC}"
echo -e "${YELLOW}📁 Директория: $BACKUP_DIR${NC}"

# Проверяем подключение к базе данных
echo -e "${BLUE}🔍 Проверяем подключение к базе данных...${NC}"
if ! docker compose exec db pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${RED}❌ Не удается подключиться к базе данных${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Подключение к базе данных успешно${NC}"

# Создаем backup
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"
echo -e "${BLUE}💾 Создаем backup файл: $BACKUP_FILE${NC}"

if docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password --verbose > "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Backup базы данных создан успешно${NC}"
    
    # Сжимаем backup
    echo -e "${BLUE}🗜️ Сжимаем backup файл...${NC}"
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    
    # Показываем информацию о файле
    FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup сжат: $COMPRESSED_FILE (размер: $FILE_SIZE)${NC}"
    
    # Создаем симлинк на последний backup
    ln -sf "$(basename "$COMPRESSED_FILE")" "$BACKUP_DIR/latest.sql.gz"
    echo -e "${GREEN}🔗 Создан симлинк на последний backup${NC}"
    
else
    echo -e "${RED}❌ Ошибка при создании backup базы данных${NC}"
    exit 1
fi

# Очищаем старые backup файлы (старше 7 дней)
echo -e "${BLUE}🧹 Очищаем старые backup файлы (старше 7 дней)...${NC}"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
echo -e "${GREEN}✅ Очистка завершена${NC}"

# Показываем статистику
echo -e "${BLUE}📊 Статистика backup директории:${NC}"
ls -lah "$BACKUP_DIR"

echo -e "${GREEN}🎉 Backup базы данных завершен успешно!${NC}"
echo -e "${YELLOW}💡 Для восстановления используйте: scripts/restore_database.sh${NC}"
