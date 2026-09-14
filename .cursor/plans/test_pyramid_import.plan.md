---
name: Test pyramid import
overview: "Поднять импорт с unit/HTTP на service + browser без раздувания PR smoke: compose-e2e IMP1/IMP2 API journeys."
todos:
  - id: test-compose-e2e-imp
    content: Два API journey в compose-e2e.sh — advance + postpay
    status: pending
  - id: test-playwright-ref
    content: Playwright опереться на P1/P2 specs; не добавлять в PR smoke
    status: pending
  - id: test-docs-pyramid
    content: Документировать пирамиду в known-gaps / development testing
    status: pending
isProject: false
---

# Test pyramid import

Поднять импорт с unit/HTTP на service + browser без раздувания PR smoke.

## Цель

Закрыть дыру «IMP есть, browser нет» и укрепить пирамиду.

## Работы

### 1. compose-e2e: два API journey

[`compose-e2e.sh`](../../vdp/scripts/compose-e2e.sh): два API journey — import advance treasurer→`payment_processing`; import postpay provider-first→rate→advance→treasurer→`report_waiting` (зеркало IMP1/IMP2 без браузера).

Добавить после существующих export-style journeys.

### 2. Playwright

Опереться на P1/P2 specs; не добавлять treasurer/postpay в обязательный PR smoke (4 specs). Это остаётся в path-filter / pilot.

### 3. Документировать пирамиду

Одна правка в [`known-gaps.md`](../../vdp/docs/pilot/known-gaps.md) / development testing при необходимости (`docs/conventions/format.md` для ops).

Зафиксировать: unit/HTTP (IMP1–3) → compose-e2e API (advance + postpay) → browser `@pilot-matrix` (P1/P2); PR smoke узкий.

## DoD

- [ ] compose-e2e включает оба import API path
- [ ] `make ci-pr` не обязан гонять полный postpay browser (это path-filter / pilot)
- [ ] Docs pyramid честна

## Сверка с rules

**Обязательны:** `тесты-архитектуры`, `go-testing`, `playwright-e2e`, `честность-готовности`, `vdp-ci-local-gate`.

**Вне scope:** раздувание PR smoke, новые продуктовые тесты вне IMP.
