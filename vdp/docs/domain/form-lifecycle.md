# Жизненный цикл заявки

Источник истины статуса — vdp/core domain form-payment. UI в vdp/fe отображает проекцию через STATUS_META и role-aware copy.

## Основной путь User to completed

creating или draft после create и recognize_complete.

organization_waiting_verification и organization_verification при submit если org не approved.

form_waiting_verification, form_verification, form_accepted после ICO и ECO.

contract_waiting, contract_verification, signing_order, signing_order_accepted — агентский договор и поручение.

payment_received, payment_processing, payment_sent — платёж через provider.

report_waiting, report_waiting_verification, report_accepted — отчёт агента.

shipment_waiting, shipment verification stages — документы об отгрузке.

completed — закрытие сделки.

## Ветка corrections

form_waiting_corrections после eco_reject или ico_reject. User submit возвращает в form_waiting_verification.

Аналогичные correction статусы для contract и signing_order.

## Ветка refund

payment_refund_waiting и связанные refund_* статусы при mgr_refund_init и далее.

cancel_by_manager с активным refund блокируется 409 cannot finalize cancel while funds are unrefunded.

## Ветка provider return

prov_payment_return переводит в manager_checking. Manager уточняет и снова mgr_payment_start.

## Nest shortcut

report/accept может перевести напрямую в completed в compose-e2e для совместимости с Nest parity path.

## Compose E2E reference path

Один form id проходит User submit, ICO, ECO, assign agent, contract, order, payment_received, assign provider, payment_start, provider_sent, report upload и accept, shipment, completed. Детали в development/testing.md.

## UI projection

Fe mapStatusLabel применяет role-specific labels из copy layer RW1–RW9. Канонический id статуса один; labels различаются по роли. Исходники: vdp/fe/src/lib/ved/copy/.
