---
name: P5 Provider execution
overview: "BDUI Provider: исполнение платежа по своим заявкам с узким DTO без ПДн клиента; подтверждение файлом или хешем."
todos:
  - id: p5-dto
    content: Narrow Provider DTO + tests against PII leak
    status: completed
  - id: p5-screens
    content: BDUI Provider screens + payment actions
    status: completed
  - id: p5-qa
    content: "QA gate: execute path + return-to-manager"
    status: completed
isProject: false
---

# P5 — Provider: исполнение платежа

## Зависимость

После **P4** (заявка назначена провайдеру, ожидает исполнения).

## Цель

Provider начинает исполнение, при необходимости возвращает менеджеру, подтверждает платёж (файл фиат / hash крипто).

## Scope

- Роль `PROVIDER`; list своих заявок + detail
- API: [`form-payment-provider.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/provider/form-payment-provider.controller.ts) (+ file provider)
- **Обязательно:** узкий response DTO без полного client account (вердикт + `безопасность-ролей-и-данных`) — реквизиты, суммы, валюты, инвойс/поручение, hash/payment proof fields
- Действия ВИ: start execution, return to manager (`MANAGER_CHECKING`), execute + upload proof/hash → `payment_sent` / аналог в коде
- Вне: SENIOR_PROVIDER; банковский API канал из «Флоу оплаты ВЭД»

## Проверка стабильности и качества

1. Unit/contract: Provider DTO не содержит PII полей клиента (явный deny-list тест)
2. Unit: resolver Provider только на payment_processing / assigned statuses
3. Ручной: start → execute with proof → статус для Manager report stage
4. Return to manager → Manager видит `manager_checking`; Provider теряет execute CTA
5. Зона: чужая заявка другого provider → 404/403
