#!/bin/bash

echo "========================================"
echo "   АВТОМАТИЗИРОВАННАЯ БАНКОВСКАЯ СИСТЕМА"
echo "========================================"
echo ""
echo "Запуск системы..."
echo ""

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "ОШИБКА: Docker не установлен!"
    echo "Установите Docker с сайта: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Запускаем систему
echo "Запуск контейнеров..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "   СИСТЕМА УСПЕШНО ЗАПУЩЕНА!"
    echo "========================================"
    echo ""
    echo "Веб-интерфейсы:"
    echo "- pgAdmin: http://localhost:5050"
    echo "- Аналитическая панель: http://localhost:8502"
    echo "- Ollama API: http://localhost:11434"
echo ""
echo "Данные для входа:"
echo "- pgAdmin: admin@example.com / PgAdmin2024@Secure!Interface#"
echo "- Дашборд: автоматическое подключение к БД"
    echo ""
    echo "Нажмите Enter для открытия браузера..."
read

# Открываем оба интерфейса
echo "🌐 Открываю веб-интерфейсы..."

# Открываем дашборд
if command -v open >/dev/null 2>&1; then
    open http://localhost:8502
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:8502
else
    echo "📊 Дашборд: http://localhost:8502"
fi

# Открываем pgAdmin
if command -v open >/dev/null 2>&1; then
    open http://localhost:5050
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:5050
else
    echo "🗄️ pgAdmin: http://localhost:5050"
fi
else
    echo ""
    echo "ОШИБКА при запуске системы!"
    echo "Проверьте, что Docker запущен."
fi

echo ""
echo "Для остановки системы используйте: docker-compose down"
