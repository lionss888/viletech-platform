---
name: UAT W3 no-docs invoice gate
overview: 'SUPERSEDED/cancelled 2026-09-24: superseded by wizard no-docs draft-only.
  Was: Early submit gate superseded by wizard no-docs draft-only. Остаётся manager/ECO
  accept block until invoice attached (F5 residual).'
todos:
- id: w3-ux-gate
  content: Early wizard gate → superseded by wizard_no-docs_draft (draft-only, no
    submit)
  status: cancelled
- id: w3-manager-cta
  content: 'Карточка manager/continuity: disabled eco_accept + причина «нужен инвойс»
    [cancelled 2026-09-24: superseded by wizard no-docs draft-only]'
  status: cancelled
- id: w3-tests
  content: 'Unit/E2E: approve blocked until invoice attached (submit no longer allowed
    on no_docs) [cancelled 2026-09-24: superseded by wizard no-docs draft-only]'
  status: cancelled
- id: w3-gate
  content: 'check-env-parity → unit → ci-pr; ci-pr-pilot если ActionPanel copy [cancelled
    2026-09-24: superseded by wizard no-docs draft-only]'
  status: cancelled
isProject: false
---

# UAT Волна 3: no_documents → invoice gate

## Источник

UAT 2026-09-23 finding **F5**. Early client submit path **superseded** by `wizard_no-docs_draft` (2026-09-24): без документов клиент сохраняет только черновик; submit запрещён в UI и domain.

## Acceptance (остаток)

1. ~~Клиент на пути no_docs может submit~~ → **N/A**: draft-only (wizard_no-docs_draft).
2. Manager/ECO primary accept disabled с причиной, пока нет invoice document (после появления документов / доработки).
3. После attach invoice — accept проходит (существующий домен).
4. Доменное правило «invoice required» **не** ослаблять ради UX.

## Вне scope

- OCR prefill (W1)
- Org hygiene (W2)
- Снятие требования инвойса в домене
- Повторная реализация draft-only wizard (уже в wizard_no-docs_draft)

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-web-практики` (guided next step / disabled+reason), `use-cases`, `интеграция-и-события` (UI = проекция), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Gate:** `check-env-parity` → unit → **`ci-pr`**; при ActionPanel → **`ci-pr-pilot`**.

## Слои

| Слой | Действие |
|---|---|
| UI | Disabled CTA reason на accept без инвойса |
| FE | ActionPanel / form-detail next step |
| Домен | без ослабления invoice required на accept |
| API | без ослабления 409 |
| Unit | helper «needs invoice for accept» |
| E2E | attach → accept; no_docs submit уже запрещён отдельно |

## DoD / QG

1. `make check-env-parity`
2. Unit + e2e на accept gate
3. Заявленный CI gate
4. F5 в журнале: early gate закрыт draft-only; residual = accept block

> **Status-sync 2026-09-24:** cancelled as obsolete/superseded — see todo notes / overview. Do not execute this plan as a product wave.
