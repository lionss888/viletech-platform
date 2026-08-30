---
name: Post-R12 Master Index
overview: "Индекс программы P1–P5: закрытие остаточных gap после R0–R12/RH без GitLab. Оценки в часах по ориентиру 25.08 (~3.8 todo/ч). GitLab — только после 100% P1–P5 по вашей команде."
todos:
  - id: track-p1
    content: Закрыть P1 Documents (PDF, шаблоны ПА, XLSX honesty)
    status: completed
  - id: track-p2
    content: Закрыть P2 Staging (DOCS_URL, MAIL_URL, bank webhook smoke)
    status: completed
  - id: track-p3
    content: Закрыть P3 Security (secrets, ACL sign-off)
    status: completed
  - id: track-p4
    content: Закрыть P4 Ops (alerts, runbooks)
    status: completed
  - id: track-p5
    content: Закрыть P5 Product E2E (rating UI, advance/shipment journeys)
    status: completed
  - id: track-gitlab-defer
    content: "GitLab: напомнить пользователю после 100%; не начинать без команды"
    status: completed
isProject: false
---

# Post-R12 — master index (P1–P5)

## Контекст

R0–R12 закрыли API/state machine (331/331, Must/Should/§9 — `ParityDone`). Остаток — **продуктовая глубина** и **prod/staging readiness**, см. [vdp/docs/pilot/known-gaps.md](vdp/docs/pilot/known-gaps.md).

**Ориентир скорости:** [заметки/ориентир-скорости-2026-08-25.md](заметки/ориентир-скорости-2026-08-25.md) — ~3.8 todo/ч, R10–R12 тяжелее. Суммарно P1–P5: **~24–28 todos → ~7–10 ч** чистой разработки (+ время на шаблоны PDF и доступы вендоров вне кода).

## Карта этапов

```mermaid
flowchart LR
  P1[P1 Documents]
  P2[P2 Staging]
  P3[P3 Security]
  P4[P4 Ops]
  P5[P5 Product E2E]
  GL[GitLab deferred]
  P1 --> P2
  P1 --> P5
  P2 --> P4
  P3 --> P4
  P1 --> P3
  P5 --> Done[100pct gate]
  P3 --> Done
  P4 --> Done
  Done -.->|по команде| GL
```

| Этап | Plan file | Gap IDs | Оценка |
|------|-----------|---------|--------|
| **P1** | `p1_documents_prod.plan.md` | G-DOC-PDF, G-DOC-TPL-PA, G-DOC-XLSX | ~3–4 ч |
| **P2** | `p2_staging_integrations.plan.md` | G-STG-DOCS, MAIL, BANK-WH; Diadoc/OCR optional | ~2 ч + vendor |
| **P3** | `p3_security_hardening.plan.md` | G-SEC-SECRETS, G-SEC-REVIEW | ~1.5–2 ч |
| **P4** | `p4_ops_observability.plan.md` | G-OPS-ALERTS, G-OPS-OBS, backup checklist | ~1–1.5 ч |
| **P5** | `p5_product_e2e_gaps.plan.md` | G-RATING-UI, G-ADV-SHIP-E2E, G-OCR policy | ~2–3 ч |
| **GitLab** | *не создавать до 100%* | CI mirror | по команде |

## Rules gate (все P*)

**Обязательны:** `чистая-архитектура`, `use-cases`, `интеграция-и-события`, `безопасность-ролей-и-данных`, `устойчивость-и-наблюдаемость`, `тесты-архитектуры`, `честность-готовности`, `правила-построения`, `развертывание-и-доставка` (immutable artifacts, secrets снаружи).

**Вне scope всех P*:** Nest data migration; logistics/analytics/assistant; combinatorial browser matrix; **GitLab CI** до закрытия P1–P5.

## Глобальный DoD (100%)

- [ ] Нет `stub.pdf` / `xlsx-placeholder` на acceptance path **или** явно задокументирован disable + подпись заказчика
- [ ] Staging smoke: DOCS + MAIL с реальными URL (скрипт/checklist)
- [ ] Prod compose/profile без dev secrets
- [ ] Security checklist подписан (ACL, Provider PII, files)
- [ ] Semantic alerts + runbook в repo
- [ ] `make release-gate` green; [known-gaps.md](vdp/docs/pilot/known-gaps.md) и [readiness-and-limits.md](vdp/docs/pilot/readiness-and-limits.md) обновлены
- [ ] **Напоминание агенту:** предложить GitLab только после чеклиста выше; исполнять **только по команде пользователя**

## Out of scope (оговорки, не gap)

- Полный паритет Nest product depth
- Load testing (отдельная задача по запросу)
- Diadoc prod — optional если пилот на manual signing
