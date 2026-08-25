---
name: P6 User close complete
overview: "BDUI User+Manager закрытие happy-path: подписи договора/поручения, оплата, отчёт агента, shipment при авансе, Manager COMPLETED."
todos:
  - id: p6-user
    content: User BDUI actions for sign/pay/report/shipment
    status: pending
  - id: p6-manager
    content: Manager accept closing docs + completed
    status: pending
  - id: p6-qa
    content: "QA gate: full 5-role happy-path to COMPLETED"
    status: pending
isProject: false
---

# P6 — User close + Manager COMPLETED

## Зависимость

После **P5** (платёж исполнен) и частично параллельно с **P4** (подписи до платежа).

## Цель

Закрыть канонический path import+аванс+товар: User подписывает документы и отчёт; при авансе — отгрузка; Manager подтверждает и переводит в `COMPLETED`.

## Scope

- User actions (site API): contract upload, order/order-advance upload, payments proof, report upload, shipment upload/accept — [`form-payment-site.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/site/form-payment-site.controller.ts)
- Manager: report/shipment accept, `PUT …/completed` — manager controller
- BDUI: detail action_bar для статусов `contract_*`, `signing_order_*`, `report_*`, `shipment_*`
- Чеклист сквозного прогона P0–P6 в `fe-experiment/LIFECYCLE.md` — отметить happy-path DONE
- Вне: Diadoc-only; refund; export path

## Проверка стабильности и качества

1. Unit: User/Manager resolvers на closing statuses
2. **Сквозной ручной прогон** под 5 seed-аккаунтами от create до `COMPLETED` (критерий программы)
3. Регрессия: после complete User/Provider не имеют mutate CTA
4. Документы обязательные по ВИ на авансе (отгрузка) проверены до complete
5. Самопроверка state machine + роли на финальном переходе
