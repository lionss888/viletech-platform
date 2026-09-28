---
name: UAT F2 submit docs
overview: "Пункт 2: на карточке черновика кнопка «Отправить на проверку» должна быть визуально и функционально disabled при 0 документов, с краткой причиной — не silent no-op."
todos:
  - id: f2-repro
    content: "Localhost: draft 0 docs — CTA активна (baseline)"
    status: pending
  - id: f2-gate
    content: Helper + ActionPanel disabled+reason для submit без docs
    status: pending
  - id: f2-tests
    content: Unit + E2E disabled→attach→enabled
    status: pending
  - id: f2-qg
    content: check-env-parity → ci-pr-pilot; закрыть DoD + notify + sync queue
    status: pending
isProject: false
---

# UAT F2: disable submit без документов

## Источник

Карточка черновика: «Документы 0», зелёная «Отправить на проверку» активна. Требование: именно **disabled** (не кликабельна + выглядит неактивной).

## Вердикт по коду

- Wizard уже гейтит docs ([wizard-steps.ts](vdp/fe/src/lib/ved/wizard-steps.ts), [forms-new-page.tsx](vdp/fe/src/components/ved/pages/forms-new-page.tsx)).
- Карточка: [ActionPanel.tsx](vdp/fe/src/components/ved/ActionPanel.tsx) — invoiceGate только для ECO/manager confirm (`invoice-accept.ts`); **нет** document-count gate на `accept_form` / submit.
- Связь с F1a: даже при 409 с бэка UI обязан заранее disabled.

## Цель

User на draft/creating с `documents.length === 0`: primary submit disabled + `title`/текст причины («нужен хотя бы один документ»). После загрузки PDF — enabled.

## Scope

- Gate в ActionPanel (или общий helper рядом с `invoice-accept`) для user submit / `accept_form` / `submit_corr` при нуле документов.
- Копирайт причины (guided next step).
- Unit + E2E: 0 docs → disabled; attach → enabled (жест upload уже есть контрактом — переиспользовать).

## Вне scope

- Ослабление доменного invoice на ECO accept.
- F1 session/401.
- Смена статусной машины.

## Слои

- UI: disabled + reason на CTA.
- FE: ActionPanel + helper (напр. `submit-docs-gate.ts`).
- Домен/API: без изменений (UI-проекция).
- Unit: gate helper.
- E2E: detail submit disabled без docs; после attach — кликабельна (`ci-pr-pilot` из-за ActionPanel).
- Compose: localhost repro.
- Docs: при необходимости строка в uat-scenarios; notify при закрытии.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики` (disabled + reason), `ux-взаимодействие-и-скорость`, `playwright-e2e`, `тесты-архитектуры`, `use-cases`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Вне scope:** ML, Provider ПДн, serverless.

## DoD / QG

- [ ] Localhost repro: 0 docs → кнопка disabled визуально
- [ ] `make check-env-parity`
- [ ] FE unit gate
- [ ] `make ci-pr-pilot` (ActionPanel / status CTA)
- [ ] Todos + DoD; sync-handoff-queue; notify-mgmt

## Accept

- При 0 документов «Отправить на проверку» disabled (opacity/cursor + нет успешного submit).
- Есть краткая причина в UI.
- После ≥1 документа CTA активна (если матрица роли/статуса допускает).
