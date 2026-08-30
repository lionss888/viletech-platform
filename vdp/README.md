# VDP

VDP — платформа для сопровождения внешнеэкономических сделок. Включает бэкенд (vdp/core), интеграции с внешними системами (vdp/hub) и веб-интерфейс (vdp/fe).

## Как быстро всё запустить

Зайдите в папку vdp и выполните make compose-up. Интерфейс откроется на http://localhost:5173, API на http://localhost:8080. 

Подробная инструкция: [docs/development/getting-started.md](docs/development/getting-started.md).

## Документация

Всё собрано в папке [docs/](docs/README.md).

Разработчикам: [как начать](docs/development/getting-started.md), [тестирование](docs/development/testing.md), [архитектура](docs/architecture/overview.md).

Для пилотного запуска: [готовность системы](docs/pilot/readiness-and-limits.md), [сценарии тестирования](docs/pilot/uat-scenarios.md).

## Веб-интерфейс

Код интерфейса лежит в vdp/fe. Детали сборки и разработки: [fe/README.md](fe/README.md).

## Служебные файлы

Файл rd0-baseline.md содержит внутренние заметки по разработке. Актуальная документация для пользователей находится в папке docs/.
