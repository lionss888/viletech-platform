# Жизненный цикл заявки

Источник истины статуса — vdp/core domain form-payment. UI в vdp/fe отображает проекцию через STATUS_META и role-aware copy.

## Основной путь User to completed

creating или draft после create и recognize_complete.

organization_waiting_verification и organization_verification при submit если org не approved.

form_waiting_verification, form_verification, form_accepted после ICO и ECO. При process-roles с выключенным ICO или ECO менеджер может вести continuity-путь approve reject на тех же статусах.

contract_waiting, contract_verification, signing_order, signing_order_accepted — агентский договор и поручение. Принятый агентский договор организации переиспользуется на следующих сделках с тем же агентом.

payment_received, payment_processing, payment_sent — платёж через provider. Детали денежного порядка зависят от маршрута импорта (см. ниже).

report_waiting, report_waiting_verification — отчёт агента. Подтверждение отчёта менеджером переводит в completed (happy path без обязательной лестницы отгрузки после accept).

shipment_waiting и связанные shipment verification stages остаются в state machine для Nest и отдельных веток (в том числе advance), но не обязательны после report accept в пилотном UI-пути.

completed — закрытие сделки.

## Импорт: аванс

Метод оплаты advance (или пустой method в MVP). После подписанного поручения клиент платит рубли агенту. Менеджер фиксирует поступление в payment_received. Казначей (роль treasurer) подтверждает покрытие через confirm-payment с опциональным сроком исполнения. Переход: payment_received → payment_processing. Далее провайдер исполняет валютный платёж. Менеджерский payment_start на авансе после казначея скрыт в UI.

Покрытие: unit и HTTP (IMP1), кабинет казначея (IMP4), @pilot-matrix deadline E2E (IMP7). Полный wizard payment_method:advance end-to-end не заявлен.

## Импорт: постоплата RATE_ON_PP

При direction import и payment_method post_payment платформа автоматически выставляет platform_postpay_mode POSTPAY_RATE_ON_PP. Primary-поручение допускается без курса (процент вознаграждения возможен). После подписи менеджер передаёт провайдеру без ожидания рублёвого покрытия клиента. Провайдер исполняет и прикладывает ПП (payment_sent). Менеджер фиксирует курс и режим вознаграждения (fixed, percent или percent_plus_fixed), затем формируется дополнительное поручение (контур ADVANCE_*). Клиент подписывает доп. поручение и платит рубли. Казначей подтверждает покрытие: переход к report_waiting. Этот порядок переопределяет общее правило «клиент платит до провайдера» только для POSTPAY_RATE_ON_PP.

Покрытие: домен и API (IMP2), режимы вознаграждения (IMP3), FE панель курса и комиссии плюс gating advance signing без rate (IMP5). Полный browser E2E постоплаты не заявлен. Режим POSTPAY_FIXED_RATE вне scope пакета.

## Ветка corrections

form_waiting_corrections после eco_reject, ico_reject или manager continuity reject. User submit возвращает в form_waiting_verification. При возврате менеджером на доработку в UI достаточно текстовой причины без справочника отметок.

Аналогичные correction статусы для contract и signing_order.

## Ветка refund

payment_refund_waiting и связанные refund_* статусы при mgr_refund_init и далее.

cancel_by_manager с активным refund блокируется 409 cannot finalize cancel while funds are unrefunded.

## Ветка provider return

prov_payment_return переводит в manager_checking. Manager уточняет и снова mgr_payment_start.

## Nest shortcut

report/accept может перевести напрямую в completed в compose-e2e для совместимости с Nest parity path.

## Compose E2E reference path

Один form id проходит User submit, ICO, ECO, assign agent, contract, order, payment_received, assign provider, payment_start, provider_sent, report upload и accept, completed. Детали в development/testing.md. Импортные ветки аванс и RATE_ON_PP покрыты целевыми Go HTTP и FE unit тестами пакета IMP, не полным compose browser ladder.

Pilot happy path: report → completed. Shipment — отдельная ветка, не обязательный ladder после report accept. Manager может вести заявку в completed сразу после подтверждённого отчёта без обязательной лестницы отгрузки.

## UI projection

Fe mapStatusLabel применяет role-specific labels из copy layer RW1–RW9. Канонический id статуса один; labels различаются по роли. Исходники: vdp/fe/src/lib/ved/copy/. Роль treasurer участвует в nest prefix и CTA confirm-payment на payment_received для импорт-аванса.
