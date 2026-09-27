---
name: VDP Reliability Program
overview: "Программа RH0–RH4: автоматический контур стабильности поверх R/RD/RW. Master + 5 дочерних plan-файлов. Исполнение — после ревью каждого RH*."
todos:
  - id: create-master
    content: vdp_reliability_master.plan.md — индекс и порядок RH0→RH4
    status: completed
  - id: create-rh0
    content: rh0_ci_pipeline.plan.md — GitHub Actions, ci.md
    status: completed
  - id: create-rh1
    content: rh1_postgres_integration.plan.md — integration tag, test-integration
    status: completed
  - id: create-rh2
    content: rh2_e2e_coverage.plan.md — compose-e2e + Playwright + matrix
    status: completed
  - id: create-rh3
    content: rh3_staging_adapters.plan.md — fake HTTP, staging-checklist
    status: completed
  - id: create-rh4
    content: rh4_release_gate.plan.md — release-gate, observability, known-gaps
    status: completed
isProject: false
---

# VDP Reliability Hardening — program overview

## Контекст

Точки роста зафиксированы после закрытия R/RD/RW:

1. **CI/CD отсутствует** — регрессии зависят от ручного `make integration-gate`
2. **Покрытие не полное** — unit покрывает домен, E2E — точечные journeys
3. **Stub-слой** — docs/mail/xlsx/kontur без реального HTTP в тестах
4. **integration-gate ≠ Playwright** — browser E2E не в одном Makefile-target для CI
5. **Узкое E2E** — 1 API happy + 4 Playwright spec, не вся матрица ролей×статусов
6. **Memory vs Postgres** — большинство Go-тестов in-process, Postgres — точечно

Программа **RH** закрывает эти пункты без ложного «100% prod parity» ([`честность-готовности`](../.cursor/rules/честность-готовности.mdc)).

## Rules gate (обязательны для всей программы)

| Rule | Применение |
|------|------------|
| [`планирование-сверка-с-rules`](../.cursor/rules/планирование-сверка-с-rules.mdc) | Каждый RH* с секцией Rules gate |
| [`развертывание-и-доставка`](../.cursor/rules/развертывание-и-доставка.mdc) | CI: job по контексту vdp/, immutable artifact |
| [`devops-культура`](../.cursor/rules/devops-культура.mdc) | CI = feedback loop, blameless |
| [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) | Пирамида; E2E узкий на journey |
| [`playwright-e2e`](../.cursor/rules/playwright-e2e.mdc) | RH0/RH2: отдельный job, role locators |
| [`go-testing`](../.cursor/rules/go-testing.mdc) | RH1: table-driven, integration tag |
| [`правила-построения`](../.cursor/rules/правила-построения.mdc) | Тесты к новым gate |
| [`честность-готовности`](../.cursor/rules/честность-готовности.mdc) | RH4: pilot ≠ prod 100% |
| [`интеграция-и-события`](../.cursor/rules/интеграция-и-события.mdc) | RH3: hub → core SM only |
| [`устойчивость-и-наблюдаемость`](../.cursor/rules/устойчивость-и-наблюдаемость.mdc) | RH4: correlation id, semantic alerts |
| [`безопасность-ролей-и-данных`](../.cursor/rules/безопасность-ролей-и-данных.mdc) | RH2/RH3: provider ACL, no PII in logs |
| [`use-cases`](../.cursor/rules/use-cases.mdc) | RH2: journey по ролям |
| [`serverless-и-faas`](../.cursor/rules/serverless-и-faas.mdc) | RH3: OCR side-path |

**Вне scope:** Nest migration; logistics/analytics/BDUI; prod secrets в git.

## Файлы программы

| Файл | Назначение |
|------|------------|
| [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md) | Master index, порядок, global DoD |
| [rh0_ci_pipeline.plan.md](rh0_ci_pipeline.plan.md) | CI/CD topology |
| [rh1_postgres_integration.plan.md](rh1_postgres_integration.plan.md) | Postgres test layer |
| [rh2_e2e_coverage.plan.md](rh2_e2e_coverage.plan.md) | E2E expansion + matrix |
| [rh3_staging_adapters.plan.md](rh3_staging_adapters.plan.md) | Staging adapters smoke |
| [rh4_release_gate.plan.md](rh4_release_gate.plan.md) | Release gate + observability |

## Порядок исполнения

```text
RH0 (CI skeleton)
  ├─► RH1 (postgres integration) ──┐
  ├─► RH2 (E2E expansion) ─────────┼─► RH4 (release gate)
  └─► RH3 (staging adapters) ──────┘
```

**Оценка:** ~9–14 дней; RH1/RH2/RH3 параллелятся после RH0.

## Prerequisites

- [x] R0–R12 backend gate green
- [x] RD10 integration-gate green локально
- [x] RD11 Playwright scaffold (4 spec)
- [x] RW9 copy consistency gate

## Global DoD

См. [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md) — секция «Глобальный DoD программы RH».
