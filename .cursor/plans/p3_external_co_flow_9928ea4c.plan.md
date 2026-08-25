---
name: P3 External CO flow
overview: "BDUI External Compliance Officer: проверка заявки FORM_WAITING_VERIFICATION — accept, corrections, cancel."
todos:
  - id: p3-screens
    content: BDUI ECO queue/detail + comment on reject
    status: completed
  - id: p3-actions
    content: Wire form start/accept/reject/cancel
    status: completed
  - id: p3-qa
    content: "QA gate: accept path + one corrections round-trip smoke"
    status: completed
isProject: false
---

# P3 — External compliance officer

## Зависимость

После **P2** (орг пройдена / skip) или заявка уже в `form_waiting_verification`.

## Цель

External CO одобряет заявку (`FORM_ACCEPTED`), возвращает на доработку или отменяет.

## Scope

- Роль `COMPLIANCE_OFFICER`; вкладка «Ожидает проверки» + карточка
- API: [`form-payment-compliance-officer.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts) — form/start, accept, reject→corrections, cancel
- UI показывает документы/условия сделки (read-only) + comment на return
- Статусы ВИ: `FORM_WAITING_VERIFICATION` / `FORM_VERIFICATION` / `FORM_WAITING_CORRECTIONS` / `FORM_ACCEPTED` / `CANCELED_BY_COMPLIANCE_OFFICER`
- Вне: analyze-counterparty ML; полный редактор всех полей менеджера

## Проверка стабильности и качества

1. Unit: ECO actions только на form_* verification статусах
2. Ручной happy-path: accept → `form_accepted`
3. Ручной ветка (минимум): reject → `form_waiting_corrections` + комментарий виден User
4. Cancel → `canceled_by_compliance_officer`; дальнейшие User submit запрещены
5. Самопроверка RBAC + идемпотентность повторного accept (ожидаемая ошибка домена)
