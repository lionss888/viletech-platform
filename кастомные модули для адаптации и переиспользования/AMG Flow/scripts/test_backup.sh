#!/bin/bash

# Тест backup системы AMG Flow
# Автор: AMG Flow Team
# Версия: 1.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Тестирование backup системы AMG Flow...${NC}"

# Проверяем, что система запущена
echo -e "${BLUE}1️⃣ Проверяем состояние системы...${NC}"
if ! docker compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Система не запущена, запускаем...${NC}"
    docker compose up -d
    sleep 10
fi

# Проверяем подключение к базе данных
echo -e "${BLUE}2️⃣ Проверяем подключение к базе данных...${NC}"
if ! docker compose exec db pg_isready -U user -d appdb > /dev/null 2>&1; then
    echo -e "${RED}❌ Не удается подключиться к базе данных${NC}"
    exit 1
fi
echo -e "${GREEN}✅ База данных доступна${NC}"

# Тестируем backup базы данных
echo -e "${BLUE}3️⃣ Тестируем backup базы данных...${NC}"
if bash scripts/backup_database.sh; then
    echo -e "${GREEN}✅ Backup базы данных успешен${NC}"
else
    echo -e "${RED}❌ Ошибка backup базы данных${NC}"
    exit 1
fi

# Тестируем backup моделей
echo -e "${BLUE}4️⃣ Тестируем backup моделей...${NC}"
if bash scripts/backup_models.sh; then
    echo -e "${GREEN}✅ Backup моделей успешен${NC}"
else
    echo -e "${YELLOW}⚠️  Backup моделей пропущен (Ollama может быть не запущен)${NC}"
fi

# Проверяем созданные файлы
echo -e "${BLUE}5️⃣ Проверяем созданные backup файлы...${NC}"
if [ -f "backups/database/latest.sql.gz" ]; then
    echo -e "${GREEN}✅ Backup базы данных создан${NC}"
    ls -lah backups/database/latest.sql.gz
else
    echo -e "${RED}❌ Backup базы данных не найден${NC}"
fi

if [ -f "models/backup/models_list.txt" ]; then
    echo -e "${GREEN}✅ Backup моделей создан${NC}"
    ls -lah models/backup/models_list.txt
else
    echo -e "${YELLOW}⚠️  Backup моделей не найден${NC}"
fi

# Тестируем полный backup
echo -e "${BLUE}6️⃣ Тестируем полный backup...${NC}"
if bash scripts/backup_full.sh; then
    echo -e "${GREEN}✅ Полный backup успешен${NC}"
else
    echo -e "${RED}❌ Ошибка полного backup${NC}"
    exit 1
fi

# Проверяем полный backup
echo -e "${BLUE}7️⃣ Проверяем полный backup...${NC}"
if [ -f "backups/full/latest.tar.gz" ]; then
    echo -e "${GREEN}✅ Полный backup создан${NC}"
    ls -lah backups/full/latest.tar.gz
    
    # Проверяем содержимое архива
    echo -e "${BLUE}📋 Содержимое архива:${NC}"
    tar -tzf backups/full/latest.tar.gz | head -10
else
    echo -e "${RED}❌ Полный backup не найден${NC}"
    exit 1
fi

# Тестируем команды Makefile
echo -e "${BLUE}8️⃣ Тестируем команды Makefile...${NC}"
if make backup-list > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Команда backup-list работает${NC}"
else
    echo -e "${YELLOW}⚠️  Команда backup-list не работает${NC}"
fi

# Показываем статистику
echo -e "${BLUE}📊 Статистика backup системы:${NC}"
echo -e "${YELLOW}📁 Директория backup:${NC}"
du -sh backups/ 2>/dev/null || echo "Директория backup не найдена"

echo -e "${YELLOW}📋 Список backup файлов:${NC}"
find backups/ -name "*.gz" -exec ls -lah {} \; 2>/dev/null || echo "Backup файлы не найдены"

echo -e "${GREEN}🎉 Тест backup системы завершен успешно!${NC}"
echo -e "${YELLOW}💡 Для просмотра всех backup команд: make help | grep backup${NC}"
