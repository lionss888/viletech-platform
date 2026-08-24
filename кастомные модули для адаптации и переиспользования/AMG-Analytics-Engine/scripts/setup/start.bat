@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Запуск системы АБС
echo ========================================
echo.

REM Проверка Docker
echo 📦 Проверка Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен или не запущен!
    echo Установите Docker Desktop и запустите его
    pause
    exit /b 1
)

echo ✅ Docker найден

REM Запуск системы
echo.
echo 🚀 Запуск контейнеров...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Ошибка запуска контейнеров!
    pause
    exit /b 1
)

echo.
echo ⏳ Ожидание запуска сервисов...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo ✅ Система запущена успешно!
echo ========================================
echo.
echo 🌐 Веб-интерфейсы:
echo - pgAdmin: http://localhost:5050
echo - Аналитическая панель: http://localhost:8502
echo.
echo 📊 База данных:
echo - PostgreSQL: localhost:5432
echo - Пользователь: lionss
echo - База: abs_core
echo.
echo Данные для входа:
echo - pgAdmin: admin@example.com / PgAdmin2024@Secure!Interface#
echo - Дашборд: автоматическое подключение к БД
echo.
echo Нажмите Enter для открытия браузера...
pause >nul

REM Открываем веб-интерфейсы
echo 🌐 Открываю веб-интерфейсы...
start http://localhost:8502
start http://localhost:5050

echo.
echo 🎯 Система готова к работе!
pause
