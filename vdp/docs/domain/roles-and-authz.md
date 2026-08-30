# Роли и авторизация

Источник политики: vdp/core/internal/authz и domain/formpayment. UI скрывает кнопки, но AuthZ проверяется на API.

## User

Зона. Только свои заявки организации.

Top tasks. Создать черновик, submit, загрузить документы, видеть статус и следующий шаг, подтвердить получение.

Действия. accept_form, user_upload_contract, user_upload_order, upload payments, report, shipment.

## Internal compliance ICO

Зона. Российские организации, первая линия по заявке и верификация org.

Top tasks. Очередь org и form, approve, reject, request fixes.

Действия. ico_form_start, ico_form_accept, ico reject paths, org approve block.

## External compliance ECO

Зона. Иностранные организации и документы сделки.

Top tasks. Review сделки, accept, reject, corrections loop с User.

Действия. eco_form_start, eco_form_accept, eco reject.

## Manager

Зона. Все заявки, очередь назначения, провайдер, contract, order, payment, refund, close.

Top tasks. Назначить агента и провайдера, контроль зависаний, закрыть сделку.

Действия. mgr_assign_agent, mgr_contract_*, mgr_order_*, mgr_assign_provider, mgr_payment_*, mgr_refund_*, mgr_report_*, mgr_shipment_*, mgr_completed.

## Provider

Зона. Только назначенные заявки. Без ПДн клиента.

Top tasks. Принять в работу, исполнить платёж, подтвердить платёжку или хеш.

Действия. prov_payment_start, prov_attach_proof, prov_payment_sent, prov_payment_return.

## Bank

Зона API. Создание заявок для организации bank-клиента. Не полноценный кабинет роли в UI MVP.

API. POST /api/v1/bank/forms с JWT bank@vdp.local.

## Root

Зона. Superadmin: все заявки, /admin accounts, cancel, /testing matrix.

Действия. root_cancel_form, admin account CRUD patch, union CTA на карточке.

Root bypass. Role root проходит RequireRoles для любой роли в authz.

## Матрица доступа к заявке

CanAccessForm проверяет CanSeeForm по роли, account id и полям формы. Provider видит только assigned. User видит own org forms. Manager и root видят широкую очередь.

Подробнее lifecycle: [form-lifecycle.md](form-lifecycle.md).
