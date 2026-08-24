#!/bin/bash

# Скрипт для автоматического backup по расписанию
# Автор: AMG Flow Team
# Версия: 1.0

# Конфигурация
BACKUP_TYPE="${1:-full}"  # full, database, models
LOG_FILE="logs/backup.log"

# Создаем директорию для логов
mkdir -p logs

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔄 Запуск автоматического backup (тип: $BACKUP_TYPE)"

# Проверяем, что система запущена
if ! docker compose ps | grep -q "Up"; then
    log "❌ Система не запущена, пропускаем backup"
    exit 1
fi

# Выполняем backup в зависимости от типа
case "$BACKUP_TYPE" in
    "full")
        log "🚀 Выполняем полный backup системы"
        bash scripts/backup_full.sh
        ;;
    "database")
        log "💾 Выполняем backup базы данных"
        bash scripts/backup_database.sh
        ;;
    "models")
        log "🤖 Выполняем backup моделей"
        bash scripts/backup_models.sh
        ;;
    *)
        log "❌ Неизвестный тип backup: $BACKUP_TYPE"
        log "💡 Доступные типы: full, database, models"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    log "✅ Backup завершен успешно"
else
    log "❌ Ошибка при выполнении backup"
    exit 1
fi
