# Готовность и ограничения MVP

Дата оценки 2026-08-30. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Не полный продуктовый паритет Nest. Не боевые интеграции без staging config.

## Полнота реализации

Оценка около 78 процентов. Backend R0–R12 закрыт на уровне API и state machine. Интеграции и polish UI copy главные оговорки.

## Качество MVP

Оценка 7 из 10 для MVP demo. Оценка 6 из 10 для prod без hardening.

Сильные unit и HTTP gate tests. compose reproducible. RH program добавил GitHub CI postgres integration expanded E2E release-gate. Слабее prod observability deployed alerting real vendor integrations.

## Передача пилот

Оценка 72–75 процентов готовности к UAT demo при green make release-gate и принятии known-gaps. Prod go-live 40–45 процентов без staging vendor config security sign-off operational monitoring.

## Что можно показывать на пилоте

Полный app journey User to completed на seed data через compose.

Role cabinets ICO ECO Manager Provider Bank channel smoke.

Unit postgres integration compose-e2e playwright six spec browser suite. CI vdp-ci.yml on main.

## Что нельзя обещать на пилоте

100 процентов готовности. Полный паритет Nest. Prod Diadoc mail OCR without staging config. Real XLSX. Prod secrets in compose defaults. Full browser matrix all statuses.

## Stub inventory hub

Docs mail stub when URL empty; HTTP contract tested in CI. OCR not on user path. Diadoc TG 1C partner callback only without vendor URL.

## Stub inventory export

XLSX placeholder bytes PK xlsx-placeholder documented in known-gaps.

## Dev secrets compose

JWT_SECRET vdp-core-dev-secret. HUB_SHARED_SECRET vdp-s2s-dev-secret. Only for local compose never prod.

## Gate metrics reference

R1 form-payment 148/148 done. R12 matrix 331/331 in-scope done. go test pass core hub. make integration-gate pass on stack. make release-gate recommended before handover.

## Следующие шаги prod

Staging env checklist real hub URLs. Security review. Deployed semantic alerting. Load testing. Nest data migration out of scope.

UAT сценарии: [uat-scenarios.md](uat-scenarios.md). Gaps: [known-gaps.md](known-gaps.md). CI: [ci.md](../operations/ci.md).
