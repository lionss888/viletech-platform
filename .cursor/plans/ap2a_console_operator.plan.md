---
name: AP2a Console operator
overview: React-паритет mgmt/delete/to-cursor plan; индикация Bearer vs agent key;
  консоль = операторский контур. [status-sync 2026-09-24 DoD] AP2a implemented; DoD
  sync
todos:
- id: ap2a-react-parity
  content: Wire mgmt/done, tg/delete, to-cursor plan в React SPA
  status: completed
- id: ap2a-key-status
  content: Отдельные статусы консоль/агент в шапке
  status: completed
- id: ap2a-smoke
  content: fe-test + make up / smoke SPA
  status: completed
isProject: false
---

# AP2a — Console = operator surface

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)

## Сверка с rules

**Обязательны:** `ui-web-практики`, `ux-*`, `typescript-clean-code`, `безопасность-ролей-и-данных`, `честность-готовности`.
**Вне scope:** второй TG-чат (AP2b).

## DoD

- [x] HITL + mgmt-done + plan/prompt из React
- [x] Статусы ключей видны
- [x] `fe/src/lib/api` сохранён при sync

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
