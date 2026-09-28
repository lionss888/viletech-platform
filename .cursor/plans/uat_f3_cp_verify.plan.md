---
name: UAT F3 CP verify
overview: "Пункт 3+3.1: CTA контрагента «Проверить» (не «Проверен») и рабочий жест проверки с обновлением бейджа на карточке."
todos:
  - id: f3-repro
    content: "Localhost: клик Проверен/approve CP — Network + бейдж"
    status: completed
  - id: f3-copy
    content: "SubjectReview: label «Проверить» + согласовать disabled copy"
    status: completed
  - id: f3-fix-path
    content: Починить persist/invalidate чтобы бейдж обновлялся
    status: completed
  - id: f3-tests
    content: Unit label/helper + approval path; E2E gesture approve CP (вне smoke → эскалация gate)
    status: completed
  - id: f3-qg
    content: check-env-parity → unit-only/SubjectReview = ci-pr; e2e вне smoke = ci-main; prepush path-aware; close DoD + notify
    status: completed
isProject: false
---

# UAT F3: проверка контрагента — copy + жест

## Источник

Блок «Проверка участников»: у непроверенного CP кнопка **«Проверен»**; клик **не меняет** статус. Нужно: label **«Проверить»** + рабочая проверка.

## Вердикт по коду

- Label зашит в [SubjectReview.tsx](vdp/fe/src/components/ved/SubjectReview.tsx) `VERDICT.approved.label = "Проверен"`.
- Persist: modal → `saveRefRecord` → [platform-store.ts](vdp/fe/src/lib/ved/platform-store.ts) → `setCounterpartyApproval` (manager/CO/root разрешены в core `SetCounterpartyApproval`).
- Бейдж: [compliance.ts](vdp/fe/src/lib/ved/compliance.ts) `subjectState`.
- Риск регрессии/связи с F1: на alpha менеджер ловил **403** на `GET counterparty` — после approve инвалидация списка может «не обновить» UI. Localhost repro обязателен; при AuthZ/mapping gap — чинить в этом плане (не ослаблять least privilege).

## Цель

На непроверенном CP: CTA «Проверить» → confirm → статус «Проверен» на бейдже и disabled «Уже проверен». Ошибка API — явный текст в модалке (уже есть `saveError`).

## Scope

- Copy: approve action label «Проверить»; badge «Проверен» / disabled «Уже проверен» без путаницы.
- Починить путь approve+refresh (invalidate registry/form subjects), чтобы бейдж обновлялся.
- Unit: label/helper; approval path manager.
- E2E или integration: manager/CO approve CP на карточке.

## Вне scope

- Переписывание всей compliance SM.
- User/provider могут approve (запрещено).
- F5 прочерки в detail CP.

## Слои

- UI: SubjectReview labels + feedback.
- FE: SubjectReview, compliance helpers, platform-store invalidate.
- API/AuthZ: только если repro докажет запрет/маппинг статуса.
- Unit + E2E journey.
- Compose localhost.
- notify + handoff sync при закрытии.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики`, `use-cases`, `безопасность-ролей-и-данных`, `интеграция-и-события`, `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

Path-aware prepush (`make prepush-gate` / Local QG «Проверить по изменениям»): SubjectReview / compliance / platform-store **не** в ladder grep → без e2e вне smoke хук выберет `ci-pr`. Не требовать `ci-pr-pilot` «из‑за detail».

- [x] Localhost repro «не работает» + скрин до/после
- [x] `make check-env-parity`
- [x] Unit + e2e/gesture на approve CP
- [x] Gate по типу diff: unit/FE без e2e вне smoke → `make ci-pr`; правка `vdp/fe/e2e/**` вне smoke (`login-form` / `user-submit` / `provider-acl` / `reject-path`) → `make ci-main`
- [x] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- Кнопка действия = «Проверить».
- После confirm бейдж CP = «Проверен»; повтор — «Уже проверен».
- Ошибка сети/AuthZ видна в UI, не silent.
