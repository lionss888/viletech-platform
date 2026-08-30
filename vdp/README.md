# VDP

VDP — платформа сопровождения внешнеэкономических сделок. Состав: vdp/core (домен и API), vdp/hub (интеграции), vdp/fe (кабинеты ролей).

## Быстрый старт

Перейдите в каталог vdp и выполните make compose-up. UI откроется на http://localhost:5173, API core на http://localhost:8080. Подробности в [docs/development/getting-started.md](docs/development/getting-started.md).

## Документация

Полный индекс: [docs/README.md](docs/README.md).

Разработчикам: [docs/development/getting-started.md](docs/development/getting-started.md), [docs/development/testing.md](docs/development/testing.md), [docs/architecture/overview.md](docs/architecture/overview.md).

Пилот и UAT: [docs/pilot/readiness-and-limits.md](docs/pilot/readiness-and-limits.md), [docs/pilot/uat-scenarios.md](docs/pilot/uat-scenarios.md).

Формат всех product docs: [docs/conventions/format.md](docs/conventions/format.md).

## Frontend

UI живёт в vdp/fe. FE-специфика: [fe/README.md](fe/README.md).

## Внутренние заметки

rd0-baseline.md — gate-заметки программы RD, не product documentation. Актуальные материалы для заказчика и разработчиков — в docs/.
