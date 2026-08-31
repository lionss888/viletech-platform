# Контексты и данные

## Принцип границ

Core владеет заявкой, статусами, ролями, refund и bank channel metadata на стороне домена.

Hub владеет очередью интеграционных задач и адаптерами провайдеров документов, почты, OCR.

Fe владеет только представлением. Fe не является источником истины по статусу.

Shared database между core и hub запрещён. Интеграция только через HTTP API, outbox и callback.

## Outbox core to hub

Core при генерации документов, отправке почты или OCR ставит запись в outbox.

Hub polling или push забирает задачу по контракту S2S с HUB_SHARED_SECRET.

Результат возвращается callback-ом на core. Повтор доставки обрабатывается идемпотентно на стороне core.

## Provider DTO

Provider получает реквизиты платежа, суммы, идентификаторы заявки и платежа, поля подтверждения.

Provider не получает ПДн клиента: ФИО, паспорт, личные контакты досье. Подробнее [../product/provider-data-boundary.md](../product/provider-data-boundary.md).

## Bank channel

Bank API — отдельный контур создания заявок для организации bank-клиента. Correlation ID сквозной для трассировки. UI copy bank channel не смешивается с root superadmin wording.

## Root UI

Root superadmin — отдельный контур dashboard, /admin, /testing. Root wording не менялся программой RW copy. Bank settings видны manager и root, но bank copy не подменяет admin terminology.

## События

shared/events описывает бизнес-термины событий: id заявки, новый статус, инициатор. Внутренности коннектора и ПДн в события не попадают.
