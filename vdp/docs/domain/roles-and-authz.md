# Кто что может делать в системе

Права доступа определяются ролью пользователя. Интерфейс может скрывать кнопки, но окончательная проверка всегда происходит на сервере.

## Пользователь (User)

Пользователи видят только заявки своей организации.

Основные задачи: создать заявку, отправить на проверку, загрузить документы, отслеживать статус, подтвердить получение платежа.

Доступные действия: подтверждение заявки, загрузка контрактов и заказов, загрузка документов об оплате, отчётов и отгрузке.

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
