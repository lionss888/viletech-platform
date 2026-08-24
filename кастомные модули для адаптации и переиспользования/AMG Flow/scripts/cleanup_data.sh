#!/bin/bash

# Скрипт для очистки старых данных по retention policy
# Автор: AMG Flow Team
# Версия: 1.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="logs/cleanup.log"

# Создаем директорию для логов
mkdir -p logs

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Функция показа помощи
show_help() {
    echo -e "${BLUE}🗑️  AMG Flow Data Cleanup${NC}"
    echo ""
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "ОПЦИИ:"
    echo "  --policy POLICY     Политика retention (default|development|production)"
    echo "  --dry-run          Показать что будет удалено без удаления"
    echo "  --table TABLE      Очистить только указанную таблицу"
    echo "  --help             Показать эту справку"
    echo ""
    echo "ПРИМЕРЫ:"
    echo "  $0 --dry-run                    # Показать что будет удалено"
    echo "  $0 --policy development         # Очистить с dev политикой"
    echo "  $0 --table messages             # Очистить только таблицу messages"
    echo "  $0 --policy production --dry-run # Показать что будет удалено в продакшене"
    echo ""
    echo "ПОЛИТИКИ:"
    echo "  default      - Стандартная политика (90 дней для сообщений)"
    echo "  development  - Разработка (180 дней для сообщений)"
    echo "  production   - Продакшен (30 дней для сообщений)"
}

# Парсинг аргументов
POLICY="default"
DRY_RUN=""
TABLE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --policy)
            POLICY="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --table)
            TABLE="--table $2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Неизвестная опция: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Проверяем, что система запущена
log "🔍 Проверяем состояние системы..."
if ! docker compose ps | grep -q "Up"; then
    log "❌ Система не запущена, запускаем..."
    docker compose up -d
    sleep 10
fi

# Проверяем подключение к базе данных
log "🔍 Проверяем подключение к базе данных..."
if ! docker compose exec db pg_isready -U user -d appdb > /dev/null 2>&1; then
    log "❌ Не удается подключиться к базе данных"
    exit 1
fi
log "✅ База данных доступна"

# Запускаем очистку
log "🚀 Запускаем очистку данных..."
log "Политика: $POLICY"
log "Dry run: ${DRY_RUN:-false}"
log "Таблица: ${TABLE:-все}"

cd "$PROJECT_DIR"

# Запускаем Python скрипт
if python3 scripts/cleanup_old_data.py --policy "$POLICY" $DRY_RUN $TABLE; then
    log "✅ Очистка данных завершена успешно"
else
    log "❌ Ошибка при очистке данных"
    exit 1
fi

log "🎉 Скрипт завершен"
