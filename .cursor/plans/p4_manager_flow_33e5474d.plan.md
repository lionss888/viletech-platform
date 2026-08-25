---
name: P4 Manager flow
overview: "BDUI Manager на happy-path import+аванс: после FORM_ACCEPTED — договор/поручение, назначение Provider, контроль до передачи исполнения."
todos:
  - id: p4-screens
    content: BDUI Manager list/detail schemas for happy-path statuses
    status: pending
  - id: p4-actions
    content: Wire order + provider assign + payment-received actions
    status: pending
  - id: p4-qa
    content: "QA gate: unit + manual to provider-ready state"
    status: pending
isProject: false
---

# P4 — Manager (happy-path)

## Зависимость

После **P3** (`form_accepted`).

## Цель

Менеджер ведёт заявку: проверка данных, агентский договор (стандартный path), формирование/отправка поручения, назначение ПА/Provider, фиксация оплаты клиента / передача в исполнение.

## Scope

- Роль `MANAGER`; list «Активные» + detail action_bar по статусу
- API: [`form-payment-manager.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/manager/form-payment-manager.controller.ts) — order generate/signing/accept/reject, payment received/start, provider assignment endpoints (как есть в менеджерском кабинете)
- Happy-path: стандартный агентский договор → `SIGNING_ORDER*` → после подписи User — payment received / назначение provider → статус ожидания исполнения
- Документ [`вводные/Флоу оплаты ВЭД.txt`](вводные/Флоу%20оплаты%20ВЭД.txt): в P4 только стандартный агентский path; субагент/услуги/ручная загрузка менеджером — не блокируют P4, перенос в P7 или follow-up
- Вне: Treasurer; полный admin шаблонов ПА

## Проверка стабильности и качества

1. Unit: Manager resolver на цепочке form_accepted → signing_order_* → payment_* 
2. Ручной: generate/signing order → User видит CTA подписи (подготовка к P6); assign provider → заявка в зоне Provider
3. Return order reject → User corrections CTA; Manager не видит Provider-only actions
4. Логи/статус согласованы с StageHash import+аванс
5. Самопроверка: только явные manager endpoints, без обхода статусов
