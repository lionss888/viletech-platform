# AMG BDUI System Deployment Guide

## Обзор

Руководство по развертыванию AMG Backend-Driven UI System в различных окружениях.

## Требования

### Минимальные требования

- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Диск**: 20 GB свободного места
- **OS**: Linux (Ubuntu 20.04+), macOS, Windows

### Рекомендуемые требования

- **CPU**: 4 ядра
- **RAM**: 8 GB
- **Диск**: 50 GB SSD
- **OS**: Linux (Ubuntu 22.04+)

### Зависимости

- Docker 20.10+
- Docker Compose 2.0+
- Git
- Make (опционально)

## Быстрое развертывание

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd amg-bdui-system
```

### 2. Настройка окружения

```bash
# Создание .env файла
cp .env.example .env

# Редактирование конфигурации
nano .env
```

### 3. Запуск системы

```bash
# Запуск всех сервисов
make up

# Или с помощью Docker Compose
docker-compose up -d
```

### 4. Проверка развертывания

```bash
# Проверка статуса
make health

# Просмотр логов
make logs
```

## Развертывание в продакшене

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
```

### 2. Настройка конфигурации

Создайте production конфигурацию с сильными паролями и настройками безопасности.

### 3. Запуск в продакшене

```bash
# Запуск с production конфигурацией
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

## Мониторинг и логирование

### 1. Настройка Prometheus

Настройте Prometheus для сбора метрик системы.

### 2. Настройка Grafana

Настройте Grafana дашборды для визуализации метрик.

### 3. Настройка логирования

Настройте централизованное логирование с помощью Fluentd или ELK Stack.

## Бэкап и восстановление

### 1. Создание бэкапа

```bash
# Автоматический бэкап
./scripts/backup.sh

# Ручной бэкап базы данных
docker-compose exec postgres pg_dump -U amg_user amg_bdui > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Восстановление из бэкапа

```bash
# Автоматическое восстановление
./scripts/restore.sh

# Ручное восстановление
docker-compose exec -T postgres psql -U amg_user -d amg_bdui < backup_file.sql
```

## Устранение неполадок

### 1. Проверка логов

```bash
# Логи всех сервисов
docker-compose logs

# Логи конкретного сервиса
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### 2. Проверка ресурсов

```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h

# Память
free -h
```

## Заключение

Этот гайд покрывает основные сценарии развертывания AMG BDUI System.
