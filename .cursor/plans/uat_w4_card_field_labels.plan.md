---
name: UAT W4 card field labels
overview: "Исправить путаницу Инвойс/Контракт на карточке, sticky «Создать заявку» и вводящий в заблуждение copy «контрагент не указан» на доработке (F6/F7/F9)."
todos:
  - id: w4-map-labels
    content: "Сверить payload invoice_number vs contract_number с UI labels на form-detail"
    status: pending
  - id: w4-sticky-cta
    content: "Скрыть/ослабить create FAB на /forms/:id — primary = next step статуса"
    status: pending
  - id: w4-corrections-copy
    content: "Доработка: не показывать «контрагент не указан» если reject/mark=docs"
    status: pending
  - id: w4-tests
    content: "Unit/E2E: labels match fields; create CTA not primary on detail; corrections reason"
    status: pending
  - id: w4-gate
    content: "check-env-parity → unit → ci-pr"
    status: pending
isProject: false
---

# UAT Волна 4: подписи полей карточки + sticky CTA

## Источник

UAT 2026-09-23 findings **F6**, **F7** (карточка ВЭД-05e8f9ff).

## Acceptance

1. Номер, введённый как «Номер инвойса» в мастере, отображается как инвойс на карточке (не как контракт).
2. Поле контракта показывает contract_number / номер договора, не номер инвойса.
3. На detail заявки primary CTA = действие из матрицы роли/статуса; «Создать заявку» не конкурирует как sticky primary.

## Вне scope

- OCR (W1), parties (W2), no_docs gate (W3)

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-web-практики` (иерархия, один primary, единый термин), `ux-когнитивная-нагрузка`, `playwright-e2e`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Gate:** `check-env-parity` → unit → **`ci-pr`**.

## Слои

| Слой | Действие |
|---|---|
| UI | Labels на form-detail параметрах |
| FE | mapping draft.invoiceNumber → display; FAB visibility by route |
| Unit | label map helper |
| E2E | create with invoice number → assert card label |
| Notify | «на карточке номер инвойса и договора на своих местах» |

## DoD / QG

1. `make check-env-parity`
2. Unit + e2e
3. `ci-pr`
4. F6/F7 закрыты в журнале
