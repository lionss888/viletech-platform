---
name: RD11 Playwright E2E
overview: "Deferred Playwright: 3–5 specs (happy, reject, provider ACL, bank). Prerequisite RD10+RW9. Plan only until scheduled."
todos:
  - id: rd11-scaffold
    content: playwright.config + projects/fixtures login seeds
    status: in_progress
  - id: rd11-specs
    content: "Specs: happy path, reject, provider ACL, bank badge"
    status: pending
  - id: rd11-ci
    content: Document how to run in CI / local compose
    status: pending
isProject: false
---

# RD11 — Playwright E2E (deferred)

## Meta
- **ID:** RD11 · **Группа:** Финал (deferred) · **Зависимости:** RD10 (желательно RW9) · **Оценка:** 2–3 дня когда исполнять

## Scope
**In:** узкий набор E2E по app `/login` seed accounts.
**Out:** дублирование всей матрицы actions; demo E2E; ML.

## Rules gate
[`playwright-e2e.mdc`](../.cursor/rules/playwright-e2e.mdc), тесты-архитектуры (E2E на вершине пирамиды).

## Planned specs (3–5)
1. Happy path User → … → completed (или до form_accepted + smoke manager — по стабильности)
2. Reject path ICO/ECO → corrections → User resubmit
3. Provider: нет колонки Клиент / нет ПДн на карточке
4. Bank badge / create via testing or API fixture
5. (optional) Refund init visible for manager

## Conventions
- Role-based locators (`getByRole`, `getByLabel`); `getByTestId` если есть
- No hardcoded timeouts; web-first assertions
- Login через `/login` seed: user/ico/eco/manager/provider

## Prerequisite
- [ ] RD10 green
- [ ] RW9 желателен (стабильные labels)

## DoD (когда исполнять)
- [ ] Specs green против compose stack
- [ ] Документирован запуск в fe README или Makefile target
- [ ] Не блокирует RD0–RD10 закрытие программы

## Note
Исполнение отложено — этот файл готов как backlog plan.
