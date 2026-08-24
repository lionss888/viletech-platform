#!/bin/bash

echo "🔍 Тестирование системы АБС..."
echo "========================================"

# Проверка контейнеров
echo "📦 Проверка контейнеров Docker..."
if docker ps | grep -q "abs_postgres"; then
    echo "✅ PostgreSQL: запущен"
else
    echo "❌ PostgreSQL: не запущен"
    exit 1
fi

if docker ps | grep -q "abs_pgadmin"; then
    echo "✅ pgAdmin: запущен"
else
    echo "❌ pgAdmin: не запущен"
    exit 1
fi

if docker ps | grep -q "abs_dashboard"; then
    echo "✅ Dashboard: запущен"
else
    echo "❌ Dashboard: не запущен"
    exit 1
fi

# Проверка портов
echo ""
echo "🌐 Проверка доступности портов..."

# PostgreSQL
if nc -z localhost 5432 2>/dev/null; then
    echo "✅ PostgreSQL: порт 5432 доступен"
else
    echo "❌ PostgreSQL: порт 5432 недоступен"
fi

# pgAdmin
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5050 | grep -q "200\|302"; then
    echo "✅ pgAdmin: порт 5050 доступен"
else
    echo "❌ pgAdmin: порт 5050 недоступен"
fi

# Dashboard
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8502 | grep -q "200"; then
    echo "✅ Dashboard: порт 8502 доступен"
else
    echo "❌ Dashboard: порт 8502 недоступен"
fi

# Проверка подключения к БД
echo ""
echo "🗄️ Проверка подключения к базе данных..."
if docker exec abs_postgres pg_isready -U lionss -d abs_core >/dev/null 2>&1; then
    echo "✅ Подключение к PostgreSQL: успешно"
else
    echo "❌ Подключение к PostgreSQL: неудачно"
fi

# Проверка данных
echo ""
echo "📊 Проверка данных в базе..."
CLIENTS_COUNT=$(docker exec abs_postgres psql -U lionss -d abs_core -t -c "SELECT COUNT(*) FROM clients;" 2>/dev/null | tr -d ' ')
ACCOUNTS_COUNT=$(docker exec abs_postgres psql -U lionss -d abs_core -t -c "SELECT COUNT(*) FROM accounts;" 2>/dev/null | tr -d ' ')
TRANSACTIONS_COUNT=$(docker exec abs_postgres psql -U lionss -d abs_core -t -c "SELECT COUNT(*) FROM transactions;" 2>/dev/null | tr -d ' ')

echo "✅ Клиентов: $CLIENTS_COUNT"
echo "✅ Счетов: $ACCOUNTS_COUNT"
echo "✅ Транзакций: $TRANSACTIONS_COUNT"

# Проверка подключения дашборда к БД
echo ""
echo "🔗 Проверка подключения дашборда к БД..."
if docker exec abs_dashboard python -c "import psycopg2; conn = psycopg2.connect(host='postgres', user='lionss', password='Lionss2025', dbname='abs_core'); conn.close(); print('OK')" 2>/dev/null | grep -q "OK"; then
    echo "✅ Dashboard → PostgreSQL: подключение успешно"
else
    echo "❌ Dashboard → PostgreSQL: подключение неудачно"
fi

echo ""
echo "🎯 Результат тестирования:"
echo "========================================"
echo "🌐 Веб-интерфейсы:"
echo "   - pgAdmin: http://localhost:5050"
echo "   - Dashboard: http://localhost:8502"
echo ""
echo "📊 База данных:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Пользователь: lionss"
echo "   - База: abs_core"
echo ""
echo "✅ Система готова к работе!"
