# Готовность и ограничения MVP

Дата оценки 2026-09-13. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Не полный продуктовый паритет Nest. Не боевые интеграции без staging config. Пакет импортных маршрутов IMP0–IMP6 закрыт на unit HTTP FE unit и make ci-pr; полный browser E2E аванса и POSTPAY_RATE_ON_PP не утверждается.

Post-Lovable FE app-контур восстановлен. Волны UX 0–4 (parties wizard docs provider report close) и FE gesture contracts (FilePickButton filechooser) в коде. B.2 FE org/docs upload ~90% (см. b2-fe-handoff.md). Staging deploy — workflows и rollback docs ready; VM Environments still ops-side.

## Полнота реализации

Оценка около 88 процентов для пилотного контура заявки с импортными ветками. Backend R0–R12 + B.2 + IMP домен и API. FE: кабинеты User Manager Provider плюс Treasurer на авансе и панель курса или комиссии на RATE_ON_PP. Prod observability и vendor hardening — оговорки. Модули analytics и assistant в vdp — placeholders.

## Качество MVP

Оценка 7.5 из 10 для MVP demo. Оценка 6 из 10 для prod без hardening.

Сильные unit и HTTP gate tests включая IMP1–3. compose reproducible. RH program и path-filter pilot-matrix на PR при касании ladder surface. Слабее prod observability deployed alerting real vendor integrations и полный browser import journeys.

## Передача пилот

Оценка 78–82 процентов готовности к UAT demo при green make ci-pr или release-gate и принятии known-gaps. Prod go-live 45–50 процентов без staging vendor config security sign-off operational monitoring и без customer robot fixtures.

## Что можно показывать на пилоте

Полный app journey User to completed на seed data через compose (process spine User Manager Provider; ICO ECO optional via process-roles).

Role cabinets ICO ECO Manager Provider Treasurer (import advance confirm) Bank channel smoke. Manager rate and commission panel на POSTPAY_RATE_ON_PP после payment_sent.

Unit postgres integration compose-e2e playwright PR smoke plus optional pilot-matrix. CI vdp-ci.yml on main.

## Что нельзя обещать на пилоте

100 процентов готовности. Полный паритет Nest. Полный browser matrix all statuses. Сквозной Playwright аванса и постоплаты. Prod Diadoc mail OCR without staging config. Real XLSX pixel fidelity. Prod secrets in compose defaults. POSTPAY_FIXED_RATE. Analytics assistant product modules. Own OCR model as PRIMARY.

## Document extraction (dual-track)

Commercial path (Yandex PRIMARY plus HITL gold plus shadow): wired in compose behind hub OCR_URL; fixture without keys. Live Yandex: set YANDEX_* in gitignored .env, EXTRACTION_PRIMARY equals yandex, EXTRACTION_FALLBACK equals fixture; smoke make extraction-yandex-smoke.

Own CPU: Ollama plus few-shot testable; prod PRIMARY own not ready until Wave E eval. EXTRACTION_PRIMARY equals own without eval report equals partial readiness only. Weights equals Wave E (lora_recipe.md).

Applied: HF for LoRA tooling; skip YaLM 100B self-host and Onyx-as-OCR; open-llms license gate before train.

## Stub inventory hub

Docs mail stub when URL empty; HTTP contract tested in CI. OCR not on user path. Diadoc TG 1C partner callback only without vendor URL.

## Stub inventory export

Nest/compliance XLSX — real OOXML. PDF — payload with PA template_id; file bytes from DOCS_URL service or dev stub.pdf. POSTPAY_RATE_ON_PP primary may omit rate in payload by design.

## Dev secrets compose

JWT_SECRET vdp-core-dev-secret. HUB_SHARED_SECRET vdp-s2s-dev-secret. Only for local compose never prod. Core/hub exit on production with these defaults.

## Gate metrics reference

R1 form-payment 148/148 done. R12 matrix 331/331 in-scope done. IMP package: HTTP IMP1 IMP2 IMP3 plus FE unit treasurer rate commission; make ci-pr green at package close. go test pass core hub. make integration-gate pass on stack. make release-gate recommended before handover.

## Следующие шаги prod

Staging: staging-env.example, scripts/staging-smoke.sh. Security: security-signoff-checklist.md. Ops: semantic-alerts.md, runbooks. Load testing. Customer robot fixture import for QG. Explicit local VDP_API_PROXY_TARGET for fe. Nest data migration out of scope.

UAT сценарии: [uat-scenarios.md](uat-scenarios.md). Gaps: [known-gaps.md](known-gaps.md). Lifecycle: [form-lifecycle.md](../domain/form-lifecycle.md). CI: [ci.md](../operations/ci.md).
