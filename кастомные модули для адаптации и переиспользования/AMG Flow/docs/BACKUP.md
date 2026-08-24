# 💾 Backup стратегия AMG Flow

## 📋 Обзор

AMG Flow включает комплексную систему backup для защиты данных и обеспечения быстрого восстановления в случае сбоев.

## 🎯 Что бэкапится

### 1. **База данных PostgreSQL**
- Все таблицы и данные
- Схема базы данных
- Индексы и ограничения
- Пользователи и права доступа

### 2. **Модели Ollama**
- Список установленных моделей
- Конфигурация моделей
- Метаданные моделей

### 3. **Конфигурационные файлы**
- Docker Compose файлы
- Переменные окружения
- Конфигурация приложения
- Настройки миграций

### 4. **Исходный код**
- Весь код приложения
- Скрипты и утилиты
- Документация

### 5. **Логи и аналитика**
- Логи приложения
- Аналитические данные
- Метрики производительности

## 🚀 Быстрый старт

### Создание backup

```bash
# Полный backup системы
bash scripts/backup_full.sh

# Только база данных
bash scripts/backup_database.sh

# Только модели Ollama
bash scripts/backup_models.sh
```

### Восстановление

```bash
# Восстановление базы данных
bash scripts/restore_database.sh latest

# Восстановление из полного backup
tar -xzf backups/full/latest.tar.gz
```

## 📁 Структура backup

```
backups/
├── full/                    # Полные backup системы
│   ├── amg_flow_backup_YYYYMMDD_HHMMSS.tar.gz
│   └── latest.tar.gz        # Симлинк на последний backup
├── database/                # Backup базы данных
│   ├── backup_appdb_YYYYMMDD_HHMMSS.sql.gz
│   └── latest.sql.gz        # Симлинк на последний backup
└── models/                  # Backup моделей
    └── backup/
        ├── models_list.txt
        └── ...
```

## ⚙️ Конфигурация

### Переменные окружения

```bash
# Настройки backup
BACKUP_RETENTION_DAYS=7      # Хранить backup 7 дней
BACKUP_COMPRESSION=gzip      # Сжатие backup
BACKUP_ENCRYPTION=false      # Шифрование backup
```

### Автоматический backup

```bash
# Добавить в crontab для ежедневного backup в 2:00
0 2 * * * /path/to/AMG-Flow/scripts/backup_schedule.sh full

# Backup базы данных каждые 6 часов
0 */6 * * * /path/to/AMG-Flow/scripts/backup_schedule.sh database
```

## 🔧 Скрипты backup

### `backup_full.sh`
- Создает полный backup системы
- Включает все компоненты
- Создает сжатый архив
- Автоматически очищает старые backup

### `backup_database.sh`
- Backup только базы данных PostgreSQL
- Создает SQL дамп
- Сжимает backup
- Проверяет целостность данных

### `backup_models.sh`
- Backup моделей Ollama
- Сохраняет список моделей
- Создает инструкции по восстановлению

### `restore_database.sh`
- Восстанавливает базу данных из backup
- Создает backup перед восстановлением
- Проверяет целостность после восстановления

### `backup_schedule.sh`
- Автоматический backup по расписанию
- Логирование операций
- Проверка состояния системы

## 📊 Мониторинг backup

### Логи
```bash
# Просмотр логов backup
tail -f logs/backup.log

# Статистика backup
ls -lah backups/full/
ls -lah backups/database/
```

### Проверка целостности
```bash
# Проверка архива
tar -tzf backups/full/latest.tar.gz

# Проверка базы данных
gunzip -c backups/database/latest.sql.gz | head -20
```

## 🚨 Восстановление после сбоя

### 1. Полное восстановление
```bash
# Остановить систему
docker compose down

# Восстановить из backup
tar -xzf backups/full/latest.tar.gz

# Запустить систему
docker compose up -d

# Восстановить базу данных
bash scripts/restore_database.sh latest
```

### 2. Восстановление только базы данных
```bash
# Восстановить базу данных
bash scripts/restore_database.sh latest

# Перезапустить API
docker compose restart api
```

### 3. Восстановление моделей
```bash
# Восстановить модели
bash scripts/model_pull.sh

# Перезапустить Ollama
docker compose restart ollama
```

## 🔒 Безопасность backup

### Рекомендации
1. **Храните backup в безопасном месте**
2. **Используйте шифрование для чувствительных данных**
3. **Регулярно тестируйте восстановление**
4. **Мониторьте размер backup директории**
5. **Настройте алерты при ошибках backup**

### Шифрование backup
```bash
# Создать зашифрованный backup
gpg --symmetric --cipher-algo AES256 backups/full/latest.tar.gz

# Расшифровать backup
gpg --decrypt backups/full/latest.tar.gz.gpg > latest.tar.gz
```

## 📈 Оптимизация backup

### Сжатие
- Используется gzip для сжатия
- Экономия места до 80%
- Быстрое сжатие/распаковка

### Инкрементальный backup
```bash
# Создать инкрементальный backup
rsync -av --link-dest=../previous_backup/ source/ current_backup/
```

### Очистка старых backup
- Автоматическая очистка backup старше 7 дней
- Настраивается через переменные окружения
- Логирование удаленных файлов

## 🆘 Устранение неполадок

### Проблемы с backup
```bash
# Проверить место на диске
df -h

# Проверить права доступа
ls -la backups/

# Проверить логи
tail -f logs/backup.log
```

### Проблемы с восстановлением
```bash
# Проверить целостность backup
file backups/database/latest.sql.gz

# Проверить подключение к БД
docker compose exec db pg_isready

# Проверить логи восстановления
bash scripts/restore_database.sh latest 2>&1 | tee restore.log
```

## 📞 Поддержка

При возникновении проблем с backup:
1. Проверьте логи в `logs/backup.log`
2. Убедитесь в наличии свободного места
3. Проверьте права доступа к директориям
4. Обратитесь к документации Docker Compose

---

**Версия документации:** 1.0  
**Последнее обновление:** $(date)  
**Автор:** AMG Flow Team
