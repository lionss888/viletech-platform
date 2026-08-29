---
name: RD0 Role Debug Gate
overview: "DONE. Gate перед ролевой отладкой: compose-up, npm test, compose-e2e, baseline seed IDs, bug template. App only."
todos:
  - id: rd0-compose
    content: make compose-up (+ fe-smoke)
    status: completed
  - id: rd0-unit
    content: cd vdp/fe && npm test
    status: completed
  - id: rd0-e2e
    content: make compose-e2e — эталон API journey
    status: completed
  - id: rd0-baseline
    content: Зафиксировать seed org/provider IDs и bug table
    status: completed
isProject: false
---

# RD0 — Gate & baseline

## Meta
- **ID:** RD0 · **Группа:** Infra · **Зависимости:** — · **Оценка:** 30–60 мин

## Scope
**In:** окружение, unit, API e2e, triage template.
**Out:** ролевые UI-фиксы; demo; Playwright; RW copy.

## Rules gate
тесты-архитектуры, правила-построения, развертывание-и-доставка, устойчивость-и-наблюдаемость (health).

## Login & entry
N/A → проверить `/login` открывается на FE (compose).

## Checklist
- [x] `cd vdp && make compose-up`
- [x] `cd vdp/fe && npm test`
- [x] `cd vdp && make compose-e2e` ([compose-e2e.sh](../vdp/scripts/compose-e2e.sh))
- [x] FE smoke / compose-fe-smoke при наличии в Makefile
- [x] Baseline: seed org id, provider id из e2e
- [x] Пустая bug-таблица (шаблон master)

## API verify
health core+hub; login всех seed ролей из e2e script.

## Fix zones
docker-compose, Makefile, seed/migrate — не FE copy.

## DoD
- [x] compose + unit + compose-e2e green
- [x] `/login` доступен
- [x] Bug template готов для RD1+

**Status:** done (2026-08-29) · notes: [vdp/rd0-baseline.md](../vdp/rd0-baseline.md)

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| — | — | — | — | — | — | — | — |
