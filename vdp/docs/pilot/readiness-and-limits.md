# Готовность и ограничения MVP

Дата оценки 2026-08-30. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Не полный продуктовый паритет Nest. Не боевые интеграции без staging config.

## Полнота реализации

Оценка около 78 процентов. Backend R0–R12 закрыт на уровне API и state machine. Интеграции и polish UI copy главные оговорки.

## Качество MVP

Оценка 7 из 10 для MVP demo. Оценка 6 из 10 для prod без hardening.

Сильные unit и HTTP gate tests. compose reproducible. Слабее prod observability CI postgres coverage everywhere.

## Передача пилот

Оценка 65–70 процентов готовности к UAT demo с оговорками. Prod go-live 35–45 процентов без доработок.

## Что можно показывать на пилоте

Полный app journey User to completed на seed data через compose.

Role cabinets ICO ECO Manager Provider Bank channel smoke.

Unit integration compose-e2e playwright partial browser suite.

## Что нельзя обещать на пилоте

100 процентов готовности. Полный паритет Nest. Prod Diadoc mail OCR без config. Real XLSX. Prod secrets in compose defaults.

## Stub inventory hub

Docs generate returns stub pdf path. Mail notify stub. OCR not on user path. Diadoc TG 1C partner callback only without vendor URL.

## Stub inventory export

XLSX placeholder bytes PK xlsx-placeholder.

## Dev secrets compose

JWT_SECRET vdp-core-dev-secret. HUB_SHARED_SECRET vdp-s2s-dev-secret. Only for local compose never prod.

## Gate metrics reference

R1 form-payment 148/148 done. R12 matrix 331/331 in-scope done. go test pass core hub. make integration-gate pass on stack.

## Следующие шаги prod

CI pipeline integration-gate. Staging env checklist. Security review. Full UI playwright to completed. Real hub URLs.

UAT сценарии: [uat-scenarios.md](uat-scenarios.md). Gaps: [known-gaps.md](known-gaps.md).
