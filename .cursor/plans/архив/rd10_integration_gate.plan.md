---
name: RD10 Integration Gate
overview: Сквозной UI journey User→completed на одной form id + final gates npm/go/compose-e2e. Связка с RW9.
todos:
  - id: rd10-ui-journey
    content: Full UI cross-role journey one form id
    status: completed
  - id: rd10-gates
    content: npm test + go test + compose-e2e + parity README
    status: completed
  - id: rd10-p0
    content: Нет открытых P0 по ролям (или defer с owner)
    status: completed
isProject: false
---

# RD10 — Integration gate (UI)

## Meta
- **ID:** RD10 · **Группа:** Финал · **Зависимости:** RD1–RD9 (желательно RW9) · **Оценка:** 0.5–1 день

## Scope
**In:** сквозной UI + regression gates.
**Out:** Playwright (RD11); demo.

## Rules gate
тесты-архитектуры, правила-построения, use-cases journey, ui-web.

## UI checklist
- [ ] Journey RD1→RD6 на одной form id (несколько login sessions)
- [ ] RD7 на payment step той же/параллельной заявки
- [ ] RD9 bank-заявка spot-check
- [ ] RD8 spot-check cancel/admin

## Gates
- [ ] `npm test` (fe)
- [ ] `go test ./...` (core)
- [ ] `make compose-e2e`
- [ ] Parity checklist в [vdp/fe/README.md](../vdp/fe/README.md)

## DoD
- [ ] Нет открытых P0 по ролям
- [ ] Global RD DoD из master выполнен

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| multi | … | … | … | … | … | … | … |
