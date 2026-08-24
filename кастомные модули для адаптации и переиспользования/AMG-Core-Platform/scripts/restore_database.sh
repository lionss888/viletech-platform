#!/bin/bash

# Скрипт для восстановления PostgreSQL базы данных
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
DB_NAME="appdb"
DB_USER="user"

echo -e "${BLUE}🔄 Восстановление базы данных...${NC}"

# Проверяем аргументы
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}📋 Доступные backup файлы:${NC}"
    ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo -e "${RED}❌ Backup файлы не найдены${NC}"
    echo ""
    echo -e "${YELLOW}💡 Использование: $0 <backup_file>${NC}"
    echo -e "${YELLOW}   Пример: $0 backup_appdb_20250101_120000.sql.gz${NC}"
    echo -e "${YELLOW}   Или: $0 latest${NC}"
    exit 1
fi

# Определяем файл для восстановления
if [ "$1" = "latest" ]; then
    BACKUP_FILE="$BACKUP_DIR/latest.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Симлинк latest не найден${NC}"
        exit 1
    fi
else
    BACKUP_FILE="$BACKUP_DIR/$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup файл не найден: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📁 Восстанавливаем из файла: $BACKUP_FILE${NC}"

# Проверяем подключение к базе данных
echo -e "${BLUE}🔍 Проверяем подключение к базе данных...${NC}"
if ! docker compose exec db pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${RED}❌ Не удается подключиться к базе данных${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Подключение к базе данных успешно${NC}"

# Предупреждение
echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Это действие перезапишет текущую базу данных!${NC}"
echo -e "${YELLOW}   Убедитесь, что у вас есть актуальный backup перед продолжением.${NC}"
read -p "Продолжить? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Восстановление отменено${NC}"
    exit 1
fi

# Создаем backup текущей базы данных перед восстановлением
echo -e "${BLUE}💾 Создаем backup текущей базы данных...${NC}"
CURRENT_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql"
if docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password > "$CURRENT_BACKUP"; then
    echo -e "${GREEN}✅ Backup текущей базы создан: $CURRENT_BACKUP${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось создать backup текущей базы${NC}"
fi

# Очищаем базу данных
echo -e "${BLUE}🧹 Очищаем базу данных...${NC}"
docker compose exec db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Восстанавливаем из backup
echo -e "${BLUE}🔄 Восстанавливаем данные...${NC}"
if zcat "$BACKUP_FILE" | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"; then
    echo -e "${GREEN}✅ База данных восстановлена успешно${NC}"
else
    echo -e "${RED}❌ Ошибка при восстановлении базы данных${NC}"
    exit 1
fi

# Проверяем восстановление
echo -e "${BLUE}🔍 Проверяем восстановление...${NC}"
TABLE_COUNT=$(docker compose exec db psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo -e "${GREEN}✅ Восстановлено таблиц: $TABLE_COUNT${NC}"

echo -e "${GREEN}🎉 Восстановление базы данных завершено успешно!${NC}"
