# Готовность и ограничения MVP

Дата оценки 2026-09-16. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Не полный продуктовый паритет Nest. Не боевые интеграции без staging config. In-scope маршруты вводных закрыты domain to E2E: импорт аванс, импорт POSTPAY_RATE_ON_PP, экспорт PAY_FROM_EXPORT, возврат ДС, опциональная ветка отгрузки. Локальная команда ci-pr-pilot зелёная 2026-09-16 (узкий PR smoke плюс вся лестница pilot-matrix: export refund shipment IMP7 IMP8). Локальная сборочная команда handover (release-gate) зелёная 2026-09-15. Полный wizard payment_method:advance, POSTPAY_FIXED_RATE, продукт логистов, analytics, own OCR PRIMARY, Nest data migration — вне in-scope.

Post-Lovable FE app-контур восстановлен. Волны UX 0–4 (parties wizard docs provider report close) и FE gesture contracts (FilePickButton filechooser) в коде. B.2 FE org/docs upload ~90% (см. b2-fe-handoff.md). Staging deploy — workflows и rollback docs ready; VM Environments still ops-side.

## Полнота реализации

Оценка около 97 процентов in-scope контура вводных после зелёной ci-pr-pilot 2026-09-16. Не 100 процентов продукта. Backend R0–R12 + B.2 + IMP + export + refund + shipment. FE: кабинеты User Manager Provider Treasurer, RefundPanel, ShipmentPanel, курс и комиссия на RATE_ON_PP. Browser ladders: import advance treasurer, import postpay RATE_ON_PP, export PAY_FROM_EXPORT, refund, shipment optional. Остаток продукта: pixel PDF, живой bank webhook, live Prometheus, ротация секретов заказчика, полный browser matrix all roles × statuses, analytics/assistant placeholders.

## Качество MVP

Оценка 8 из 10 для in-scope demo маршрутов вводных. Оценка 6.5 из 10 для prod ownership: секреты заказчика и live alerting не закрыты. Не 10 и не 100 процентов продукта.

Сильные unit и HTTP gate tests включая IMP1–3. compose reproducible. RH program и path-filter pilot-matrix на PR при касании ladder surface. Phase 4 Ops: correlation logging, semantic alerts architecture, runbooks complete. Слабее: live Prometheus deployment (awaiting ops infrastructure), real vendor integrations on staging, wizard payment_method:advance end-to-end browser и import journeys вне обязательного PR smoke.

## Передача пилот

In-scope маршруты вводных: 100 процентов заявленной матрицы domain to E2E при зелёной ci-pr-pilot 2026-09-16 и принятых known-gaps. Это не 100 процентов roadmap. UAT demo этих маршрутов 96–97 процентов. Prod go-live 55–60 процентов: alpha health 200, software gate зелёный; ротация секретов и live alerting у заказчика и ops.

## Что можно показывать на пилоте

Полный app journey User to completed на seed data через compose (process spine User Manager Provider; ICO ECO optional via process-roles).

Role cabinets ICO ECO Manager Provider Treasurer (import advance confirm, export PAY_FROM_EXPORT) Bank channel smoke. Manager rate and commission panel на POSTPAY_RATE_ON_PP после payment_sent. Pilot-matrix browser: import advance treasurer с deadline, import postpay RATE_ON_PP до completed, export PAY_FROM_EXPORT treasurer до completed, refund happy path, optional shipment branch. Ветка отгрузки не заменяет report completed и не равна полному логистическому продукту.

Unit postgres integration compose-e2e полный browser suite plus pilot-matrix. ci-pr-pilot зелёная 2026-09-16. Локальная сборочная команда handover зелёная 2026-09-15. CI vdp-ci.yml on main.

## Что нельзя обещать на пилоте

100 процентов готовности продукта. Полный паритет Nest. Полный browser matrix all statuses. Полный wizard payment_method:advance. Множественные экспортные сценарии за пределами PAY_FROM_EXPORT treasurer happy path. Продукт логистов. POSTPAY_FIXED_RATE. Prod Diadoc mail OCR without staging config. Real XLSX pixel fidelity. Prod secrets in compose defaults. Analytics assistant. Own OCR model as PRIMARY. Nest data migration.

## Document extraction (dual-track)

Commercial path (Yandex PRIMARY plus HITL gold plus shadow): wired in compose behind hub OCR_URL; fixture without keys. Live Yandex: set YANDEX_* in gitignored .env, EXTRACTION_PRIMARY equals yandex, EXTRACTION_FALLBACK equals fixture; smoke make extraction-yandex-smoke.

Pilot PRIMARY equals Docling (EXTRACTION_PRIMARY equals docling, EXTRACTION_DOCLING_URL, OCR_TIMEOUT_MS equals 180000, GATEWAY_TIMEOUT equals 180). Yandex is not PRIMARY on this pilot. Smoke: make extraction-docling-smoke. HITL confirm remains mandatory.

Own CPU: Ollama plus few-shot testable; prod PRIMARY own not ready until Wave E eval. EXTRACTION_PRIMARY equals own without eval report equals partial readiness only. Weights equals Wave E (lora_recipe.md).

Applied: HF for LoRA tooling; skip YaLM 100B self-host and Onyx-as-OCR; open-llms license gate before train.

## Stub inventory hub

Docs mail stub when URL empty; HTTP contract tested in CI. OCR not on user path. Diadoc TG 1C partner callback only without vendor URL.

## Stub inventory export

Nest/compliance XLSX — real OOXML. PDF — payload with PA template_id; file bytes from DOCS_URL service or dev stub.pdf. POSTPAY_RATE_ON_PP primary may omit rate in payload by design.

## Dev secrets compose

JWT_SECRET vdp-core-dev-secret. HUB_SHARED_SECRET vdp-s2s-dev-secret. Only for local compose never prod. Core/hub exit on production with these defaults.

## Gate metrics reference

R1 form-payment 148/148 done. R12 matrix 331/331 in-scope done. IMP series закрыт: HTTP IMP1 IMP2 IMP3; FE unit treasurer rate commission; compose-e2e IMP1 IMP2; pilot-matrix IMP7 IMP8. Export Phase 5-6: domain HTTP FE unit E2E PAY_FROM_EXPORT treasurer до completed. Refund Phase 7: domain HTTP FE E2E. Shipment Phase 8: optional branch domain HTTP FE E2E. ci-pr-pilot green 2026-09-16 (9 specs @pilot-matrix). Локальная сборочная команда handover green 2026-09-15.

## Следующие шаги prod

Staging: staging-env.example, scripts/staging-smoke.sh. Security: security-signoff-checklist.md. Ops: semantic-alerts.md, runbooks. Load testing. Customer robot fixture import for QG. Explicit local VDP_API_PROXY_TARGET for fe. Nest data migration out of scope.

UAT сценарии: [uat-scenarios.md](uat-scenarios.md). Gaps: [known-gaps.md](known-gaps.md). Lifecycle: [form-lifecycle.md](../domain/form-lifecycle.md). CI: [ci.md](../operations/ci.md).
