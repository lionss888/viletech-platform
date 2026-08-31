# Готовность и ограничения MVP

Дата оценки 2026-08-31. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Не полный продуктовый паритет Nest. Не боевые интеграции без staging config.

Post-Lovable (2026-08-31): FE app-контур восстановлен после sync-regression; browser UAT ~70–75% на compose seed. B.2 FE org/docs upload ~90% (см. b2-fe-handoff.md). Gates: npm test 93, compose-e2e, playwright 9 tests, test-cd-scripts green. Staging deploy — workflows и rollback docs ready; VM Environments still ops-side.

## Полнота реализации

Оценка около 80 процентов. Backend R0–R12 + B.2 backend закрыт на уровне API. FE app re-integrated; prod observability и vendor hardening — оговорки.

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

Nest/compliance XLSX — real OOXML. PDF — payload with PA template_id; file bytes from DOCS_URL service or dev stub.pdf.

## Dev secrets compose

JWT_SECRET vdp-core-dev-secret. HUB_SHARED_SECRET vdp-s2s-dev-secret. Only for local compose never prod. Core/hub exit on production with these defaults.

## Gate metrics reference

R1 form-payment 148/148 done. R12 matrix 331/331 in-scope done. go test pass core hub. make integration-gate pass on stack. make release-gate recommended before handover.

## Следующие шаги prod

Staging: staging-env.example, scripts/staging-smoke.sh. Security: security-signoff-checklist.md. Ops: semantic-alerts.md, runbooks. Load testing. Nest data migration out of scope.

UAT сценарии: [uat-scenarios.md](uat-scenarios.md). Gaps: [known-gaps.md](known-gaps.md). CI: [ci.md](../operations/ci.md).
