#!/bin/bash

echo "========================================"
echo "   АНАЛИТИЧЕСКАЯ ПАНЕЛЬ АБС"
echo "========================================"
echo ""

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "ОШИБКА: Python 3 не установлен!"
    echo "Установите Python 3 с сайта: https://www.python.org/downloads/"
    exit 1
fi

# Проверяем наличие pip
if ! command -v pip3 &> /dev/null; then
    echo "ОШИБКА: pip3 не установлен!"
    exit 1
fi

# Устанавливаем зависимости
echo "Установка зависимостей..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "   ЗАВИСИМОСТИ УСТАНОВЛЕНЫ!"
    echo "========================================"
    echo ""
    echo "Запуск аналитической панели..."
    echo "Панель будет доступна по адресу: http://localhost:8501"
    echo ""
    echo "Нажмите Ctrl+C для остановки"
    echo ""
    
    # Запускаем Streamlit
    streamlit run amg_dashboard.py
else
    echo ""
    echo "ОШИБКА при установке зависимостей!"
    echo "Проверьте подключение к интернету и права доступа."
fi
