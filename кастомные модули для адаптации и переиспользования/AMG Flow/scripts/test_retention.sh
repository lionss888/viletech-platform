#!/bin/bash

# Тест retention policy системы AMG Flow
# Автор: AMG Flow Team
# Версия: 1.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Тестирование retention policy системы AMG Flow...${NC}"

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

# Проверяем существование таблиц
echo -e "${BLUE}3️⃣ Проверяем существование таблиц...${NC}"
TABLES=("messages" "user_sessions" "user_interactions" "conversation_metrics")
for table in "${TABLES[@]}"; do
    if docker compose exec db psql -U user -d appdb -c "\dt $table" | grep -q "$table"; then
        echo -e "${GREEN}✅ Таблица $table существует${NC}"
    else
        echo -e "${YELLOW}⚠️  Таблица $table не найдена${NC}"
    fi
done

# Тестируем dry run
echo -e "${BLUE}4️⃣ Тестируем dry run режим...${NC}"
if bash scripts/cleanup_data.sh --dry-run; then
    echo -e "${GREEN}✅ Dry run режим работает${NC}"
else
    echo -e "${RED}❌ Ошибка в dry run режиме${NC}"
    exit 1
fi

# Тестируем Python скрипт напрямую
echo -e "${BLUE}5️⃣ Тестируем Python скрипт...${NC}"
if python3 scripts/cleanup_old_data.py --dry-run; then
    echo -e "${GREEN}✅ Python скрипт работает${NC}"
else
    echo -e "${RED}❌ Ошибка в Python скрипте${NC}"
    exit 1
fi

# Тестируем разные политики
echo -e "${BLUE}6️⃣ Тестируем разные политики...${NC}"
POLICIES=("default" "development" "production")
for policy in "${POLICIES[@]}"; do
    echo -e "${YELLOW}Тестируем политику: $policy${NC}"
    if bash scripts/cleanup_data.sh --policy "$policy" --dry-run > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Политика $policy работает${NC}"
    else
        echo -e "${RED}❌ Ошибка в политике $policy${NC}"
    fi
done

# Тестируем очистку конкретной таблицы
echo -e "${BLUE}7️⃣ Тестируем очистку конкретной таблицы...${NC}"
if bash scripts/cleanup_data.sh --table messages --dry-run; then
    echo -e "${GREEN}✅ Очистка конкретной таблицы работает${NC}"
else
    echo -e "${RED}❌ Ошибка в очистке конкретной таблицы${NC}"
fi

# Тестируем команды Makefile
echo -e "${BLUE}8️⃣ Тестируем команды Makefile...${NC}"
if make cleanup-dry-run > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Команда cleanup-dry-run работает${NC}"
else
    echo -e "${YELLOW}⚠️  Команда cleanup-dry-run не работает${NC}"
fi

# Проверяем конфигурацию
echo -e "${BLUE}9️⃣ Проверяем конфигурацию retention policy...${NC}"
if [ -f "app/config/retention.py" ]; then
    echo -e "${GREEN}✅ Конфигурация retention policy найдена${NC}"
    
    # Проверяем импорт конфигурации
    if python3 -c "from app.config.retention import DEFAULT_RETENTION_POLICY; print('Config loaded successfully')" 2>/dev/null; then
        echo -e "${GREEN}✅ Конфигурация загружается корректно${NC}"
    else
        echo -e "${RED}❌ Ошибка загрузки конфигурации${NC}"
    fi
else
    echo -e "${RED}❌ Конфигурация retention policy не найдена${NC}"
fi

# Показываем статистику таблиц
echo -e "${BLUE}🔟 Статистика таблиц:${NC}"
for table in "${TABLES[@]}"; do
    if docker compose exec db psql -U user -d appdb -c "\dt $table" | grep -q "$table"; then
        COUNT=$(docker compose exec db psql -U user -d appdb -t -c "SELECT COUNT(*) FROM $table;" | tr -d ' ')
        echo -e "${YELLOW}📊 $table: $COUNT записей${NC}"
    fi
done

# Показываем размер БД
echo -e "${BLUE}📊 Размер базы данных:${NC}"
docker compose exec db psql -U user -d appdb -c "
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database 
WHERE datname = 'appdb';
"

echo -e "${GREEN}🎉 Тест retention policy системы завершен успешно!${NC}"
echo -e "${YELLOW}💡 Для просмотра всех команд очистки: make help | grep cleanup${NC}"
