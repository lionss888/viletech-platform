# Документы и загрузки

## Типы документов по этапу

### Агентский договор contract

Статусы contract_waiting, contract_verification. User user_upload_contract. Manager mgr_contract_attach, mgr_contract_confirm.

### Поручение signing order

Статусы signing_order и verification substates. User user_upload_order. Manager mgr_order_generate, mgr_order_attach, order accept reject.

### Платёжные документы payment

После signing_order_accepted User загружает payment files. MetaPayments attach без преждевременного transition в payment_received где требует bridge.

Provider prov_attach_proof — подтверждение платёжка или хеш. Без ПДн клиента.

### Отчёт агента report

Статусы report_waiting, report_waiting_verification. User upload_report. Manager report start accept reject.

### Отгрузка shipment

Статусы shipment_waiting и verification. User shipment_upload. Manager mgr_shipment_waiting, shipment start, mgr_completed.

## Хранение и hub

Core хранит metadata документов в JSON формы. Генерация PDF через outbox to hub с полным payload (`template_id` по агенту ПА). XLSX — `export.MinimalXLSX` на export endpoints.

Dev без DOCS_URL: hub stub `docs/{id}/stub.pdf`. Staging: DOCS_URL + `scripts/staging-smoke.sh`. См. operations/staging-checklist.md.

## ACL по ролям

User загружает contract, order, payment, report, shipment для своей заявки.

Manager attach contract manual, verify uploads.

Provider только payment proof и requisites block без client PII.

## File attach API

POST docs attach и role-specific Nest-parity paths. Wrong status возвращает 409. Wrong role возвращает 403.
