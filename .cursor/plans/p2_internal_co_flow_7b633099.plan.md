---
name: P2 Internal CO flow
overview: "BDUI Internal Compliance Officer: очередь и карточка первой проверки РФ-организации до accept/reject/return."
todos:
  - id: p2-screens
    content: BDUI ICO queue + detail schemas and action bar
    status: completed
  - id: p2-actions
    content: Wire ICO site API actions; org edit lock after decision
    status: completed
  - id: p2-qa
    content: "QA gate: unit + manual first-org approval path"
    status: completed
isProject: false
---

# P2 — Internal compliance officer

## Зависимость

После **P1** (есть заявка на первой РФ-организации).

## Цель

Internal CO видит очередь, начинает проверку, подтверждает / блокирует / возвращает на уточнение.

## Scope

- Роль `INTERNAL_COMPLIANCE_OFFICER`; pages: queue + org/form detail
- Действия: start / stop / accept / reject / cancel — API [`form-payment-internal-compliance-officer.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts) + organization ICO controllers
- Статусы: `organization_waiting_verification` → `organization_verification` → accept → дальше к External CO; reject/block по ВИ
- Ограничение ВИ: после accept/block клиент не редактирует ключевые поля организации (отразить в User schema conditions)
- Вне: полный compliance-history UX; не-РФ орг

## Проверка стабильности и качества

1. Unit: resolver ICO только на org-* статусах; User/Manager не видят ICO CTA
2. Ручной: login ICO → очередь → start → accept; заявка уходит с org-stage
3. Return на уточнение → User может править → повторный submit возвращает к ICO
4. Зона видимости: только заявки/орг своей ответственности (как в API)
5. Самопроверка роли + перехода статусов
