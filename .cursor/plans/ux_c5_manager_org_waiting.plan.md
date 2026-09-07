---
name: UX C5 Manager org waiting UX
overview: "Не выдавать ICO-действия менеджеру; явный Следующий шаг + согласованный empty state и счётчики."
todos:
  - id: c5-hint
    content: nextStepHint by role + NextStep block on detail
    status: pending
  - id: c5-empty
    content: ActionPanel empty state names waiting role
    status: pending
  - id: c5-test
    content: Unit tests for next-step / waiting actor
    status: pending
isProject: false
---

# C5 — Менеджер и organization_waiting_verification

## Rules
**Обязательны:** use-cases, ui-web-практики (guided next step), безопасность-ролей-и-данных, Hick/Flow.
**Вне scope:** manager gets ico_form_start.

## Fix
- `nextStepHint(status, role)` — для manager на org waiting: «Ожидает внутреннего комплаенса: взять в проверку»
- Form detail: блок «Следующий шаг»
- ActionPanel empty: назвать роль владельца статуса
- Не менять семантику «Требуют моего действия» (пусто для manager — корректно)

## DoD
- [ ] Менеджер понимает, кто действует
- [ ] Фильтр «мои действия» по-прежнему без этой заявки
---
