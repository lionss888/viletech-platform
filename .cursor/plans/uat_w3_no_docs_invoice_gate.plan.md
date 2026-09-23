---
name: UAT W3 no-docs invoice gate
overview: "Путь «нет документов» не должен упираться в 409 invoice required на compliance без явного UX-гейта (F5)."
todos:
  - id: w3-ux-gate
    content: "Wizard/review: если no_documents — предупреждение что инвойс нужен до accept/approve"
    status: pending
  - id: w3-manager-cta
    content: "Карточка manager/continuity: disabled eco_accept + причина «нужен инвойс»"
    status: pending
  - id: w3-tests
    content: "Unit/E2E: no_docs submit ok; approve blocked until invoice attached"
    status: pending
  - id: w3-gate
    content: "check-env-parity → unit → ci-pr; ci-pr-pilot если ActionPanel copy"
    status: pending
isProject: false
---

# UAT Волна 3: no_documents → invoice gate

## Источник

UAT 2026-09-23 finding **F5**.

## Acceptance

1. Клиент на пути «У меня нет документов» видит, что инвойс всё равно понадобится до приёмки комплаенсом (не сюрприз на 409).
2. Manager/ECO primary accept disabled с причиной, пока нет invoice document.
3. После attach invoice — accept проходит (существующий домен).
4. Доменное правило «invoice required» **не** ослаблять ради UX.

## Вне scope

- OCR prefill (W1)
- Org hygiene (W2)
- Снятие требования инвойса в домене

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-web-практики` (guided next step / disabled+reason), `use-cases`, `интеграция-и-события` (UI = проекция), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Gate:** `check-env-parity` → unit → **`ci-pr`**; при ActionPanel → **`ci-pr-pilot`**.

## Слои

| Слой | Действие |
|---|---|
| UI | Copy на wizard no_docs + review; disabled CTA reason |
| FE | ActionPanel / form-detail next step |
| Домен | без изменений правила invoice required |
| API | без ослабления 409 |
| Unit | copy/helper «needs invoice for accept» |
| E2E | no_docs → submit → manager sees block; attach → accept |
| Notify | «без инвойса заявку нельзя принять на проверке» |

## DoD / QG

1. `make check-env-parity`
2. Unit + e2e на gate
3. Заявленный CI gate
4. F5 закрыт в журнале
