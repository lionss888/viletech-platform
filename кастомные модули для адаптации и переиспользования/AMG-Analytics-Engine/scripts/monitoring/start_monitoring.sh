#!/bin/bash

# AMG Banking Core - Запуск системы мониторинга
# Автор: AMG Team
# Версия: 1.0

set -e

echo "🚀 Запуск системы мониторинга AMG Banking Core..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Проверка портов
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Порт $port уже занят. Возможно, $service уже запущен."
        return 1
    fi
    return 0
}

echo "🔍 Проверка доступности портов..."

ports_to_check=(
    "9090:Prometheus"
    "3000:Grafana"
    "5601:Kibana"
    "9200:Elasticsearch"
    "24224:Fluentd"
    "9093:Alertmanager"
    "9100:Node Exporter"
    "8080:cAdvisor"
    "9115:Blackbox Exporter"
)

for port_info in "${ports_to_check[@]}"; do
    IFS=':' read -r port service <<< "$port_info"
    if ! check_port $port $service; then
        echo "   Порт $port ($service) - занят"
    else
        echo "   Порт $port ($service) - свободен"
    fi
done

# Создание необходимых папок
echo "📁 Создание необходимых папок..."
mkdir -p monitoring/logs
mkdir -p monitoring/grafana/dashboards
mkdir -p logs

# Запуск системы мониторинга
echo "🐳 Запуск контейнеров мониторинга..."

# Остановка существующих контейнеров мониторинга
echo "🛑 Остановка существующих контейнеров мониторинга..."
docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true

# Запуск новых контейнеров
echo "▶️  Запуск системы мониторинга..."
docker-compose -f docker-compose.monitoring.yml up -d

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."

wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    echo "   Ожидание $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "   ✅ $service запущен"
            return 0
        fi
        
        echo "   ⏳ Попытка $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    echo "   ❌ $service не запустился за отведенное время"
    return 1
}

# Ожидание Elasticsearch
wait_for_service "http://localhost:9200" "Elasticsearch" || true

# Ожидание Prometheus
wait_for_service "http://localhost:9090" "Prometheus" || true

# Ожидание Grafana
wait_for_service "http://localhost:3000" "Grafana" || true

# Проверка статуса контейнеров
echo "📊 Статус контейнеров мониторинга:"
docker-compose -f docker-compose.monitoring.yml ps

# Вывод информации о доступе
echo ""
echo "🎉 Система мониторинга запущена!"
echo ""
echo "📱 Доступ к сервисам:"
echo "   • Grafana:        http://localhost:3000 (admin/admin123)"
echo "   • Prometheus:     http://localhost:9090"
echo "   • Kibana:         http://localhost:5601"
echo "   • Alertmanager:   http://localhost:9093"
echo "   • Elasticsearch:  http://localhost:9200"
echo ""
echo "🔧 Полезные команды:"
echo "   • Просмотр логов: docker-compose -f docker-compose.monitoring.yml logs -f"
echo "   • Остановка:      docker-compose -f docker-compose.monitoring.yml down"
echo "   • Перезапуск:     docker-compose -f docker-compose.monitoring.yml restart"
echo ""
echo "📚 Документация: monitoring/README.md"
echo ""

# Проверка интеграции с основным приложением
echo "🔗 Проверка интеграции с основным приложением..."

if docker ps | grep -q "abs_dashboard"; then
    echo "   ✅ Основное приложение AMG запущено"
    echo "   📊 Метрики будут автоматически собираться"
else
    echo "   ⚠️  Основное приложение AMG не запущено"
    echo "   💡 Запустите: docker-compose up -d"
fi

echo ""
echo "🚀 Система мониторинга готова к работе!"
echo "   Начните с открытия Grafana и настройки дашбордов."
