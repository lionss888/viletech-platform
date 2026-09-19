# Жизненный цикл заявки

Источник истины статуса — vdp/core domain form-payment. UI в vdp/fe отображает проекцию через STATUS_META и role-aware copy.

## Основной путь User to completed

creating или draft после create и recognize_complete.

organization_waiting_verification и organization_verification при submit если org не approved.

form_waiting_verification, form_verification, form_accepted после ICO и ECO. При process-roles с выключенным ICO или ECO менеджер может вести continuity-путь approve reject на тех же статусах.

contract_waiting, contract_verification, signing_order, signing_order_accepted — агентский договор и поручение. Принятый агентский договор организации переиспользуется на следующих сделках с тем же агентом.

payment_received, payment_processing, payment_sent — платёж через provider. Детали денежного порядка зависят от маршрута импорта (см. ниже).

report_waiting, report_waiting_verification — отчёт агента. Подтверждение отчёта менеджером переводит в completed (happy path без обязательной лестницы отгрузки после accept). Шкала Жизненный цикл в UI не показывает Отгрузку между Отчётом и Завершено; этап Отгрузка появляется на полоске только если заявка уже в shipment_*.

shipment_waiting и связанные shipment verification stages остаются в state machine для Nest и отдельных веток (в том числе advance), но не обязательны после report accept в пилотном UI-пути.

completed — закрытие сделки.

## Импорт: аванс

Метод оплаты advance (или пустой method в MVP). После подписанного поручения клиент платит рубли агенту. Менеджер фиксирует поступление в payment_received. Казначей (роль treasurer) подтверждает покрытие через confirm-payment с опциональным сроком исполнения. Переход: payment_received → payment_processing. Далее провайдер исполняет валютный платёж. Менеджерский payment_start на авансе после казначея скрыт в UI.

Покрытие: unit и HTTP (IMP1), кабинет казначея (IMP4), @pilot-matrix deadline E2E (IMP7). Полный wizard payment_method:advance end-to-end не заявлен.

## Импорт: постоплата RATE_ON_PP

При direction import и payment_method post_payment платформа автоматически выставляет platform_postpay_mode POSTPAY_RATE_ON_PP. Primary-поручение допускается без курса (процент вознаграждения возможен). После подписи менеджер передаёт провайдеру без ожидания рублёвого покрытия клиента. Провайдер исполняет и прикладывает ПП (payment_sent). Менеджер фиксирует курс и режим вознаграждения (fixed, percent или percent_plus_fixed), затем формируется дополнительное поручение (контур ADVANCE_*). Клиент подписывает доп. поручение и платит рубли. Казначей подтверждает покрытие: переход к report_waiting. Этот порядок переопределяет общее правило «клиент платит до провайдера» только для POSTPAY_RATE_ON_PP.

Покрытие: домен и API (IMP2), режимы вознаграждения (IMP3), FE панель курса и комиссии плюс gating advance signing без rate (IMP5), полный browser ladder @pilot-matrix (IMP8, spec pilot-matrix-postpay-rate). Режим POSTPAY_FIXED_RATE вне scope пакета.

## Экспорт: казначей PAY_FROM_EXPORT

При direction export и payment_method PAY_FROM_EXPORT экспортная заявка проходит через отдельный казначейский flow. После принятия формы (form_accepted) менеджер инициирует предоплатное поручение (advance_signing_order). Клиент загружает подписанное поручение, менеджер проверяет. После приёма поручения (advance_signing_order_accepted) менеджер фиксирует получение валютной оплаты от контрагента (payment_received). Затем payment_start для передачи казначею.

Казначей подтверждает платёж через treasurer_confirm с методом PAY_FROM_EXPORT: переход в payment_sent_treasurer. Далее treasurer_signing переводит в signing_order_treasurer для формирования поручения. User загружает верификационный документ (signing_order_verification_treasurer). Treasurer_complete завершает сделку: переход в completed без обязательной лестницы отчёта.

Экспортный treasurer flow отдельный от импортного покрытия и не подменяет импортную логику. Отличие от импорта: клиент получает деньги от контрагента до казначейского подтверждения, что является противоположным импортному аддендуму секции 10 во вводных.

Покрытие: домен, state machine transitions, unit tests, HTTP API tests (Phase 5). UI кабинеты казначея и browser E2E ladder PAY_FROM_EXPORT treasurer до completed (Phase 6, spec pilot-matrix-export). Не все экспортные сценарии и не полный wizard payment_method.

## Ветка corrections

form_waiting_corrections после eco_reject, ico_reject или manager continuity reject. User submit возвращает в form_waiting_verification. При возврате менеджером на доработку в UI достаточно текстовой причины без справочника отметок.

Аналогичные correction статусы для contract и signing_order.

## Ветка refund

Возврат средств клиенту после получения платежа. Инициируется менеджером из статусов signing_order_accepted, payment_received, manager_checking или advance_signing_order_accepted (любого статуса где FundsHeld true).

Поток возврата начинается с mgr_refund_init переводящего форму в payment_refund_waiting с обязательным указанием суммы и валюты возврата (должны совпадать с полученными средствами) и установкой FundsHeld true. Действие mgr_refund_start переводит в payment_refund_processing для запуска процесса возврата. Опционально mgr_refund_file прикрепляет подтверждающий документ возврата. Действие mgr_refund_sent переводит в payment_refund_sent для подтверждения возврата средств устанавливая FundsRefunded true и FundsHeld false. Действие mgr_refund_stop откатывает из payment_refund_processing в payment_refund_waiting. Действие mgr_refund_cancel отменяет процесс возврата возвращая к предыдущему статусу (signing_order_accepted или advance_signing_order_accepted).

Инвариант невозвращённых средств: отмена заявки (cancel_by_manager, cancel_by_user, cancel_by_eco, cancel_by_ico) блокируется с кодом 409 CONFLICT если FundsHeld true и FundsRefunded false. Ошибка: cannot finalize cancel while funds are unrefunded initiate refund first. После payment_refund_sent средства считаются возвращёнными (FundsRefunded true), отмена заявки разрешена.

Валидация суммы возврата: сумма и валюта должны точно совпадать с полученными средствами (ValidateRefundAmount). Частичный возврат вне scope MVP.

Покрытие: домен (refund.go, machine.go, transitions.go), unit tests (refund_test.go включая invariant, stop/cancel, amount validation), HTTP routes (r7_refund_routes.go), HTTP tests (r7_refund_test.go включая AuthZ для Manager/Treasurer), FE API (refund.ts), FE UI (RefundPanel.tsx, ActionPanel refund CTAs, actions.ts refund mappings), FE unit tests (manager-payment.test.ts refund bridge), E2E @pilot-matrix (pilot-matrix-refund.spec.ts happy path и stop/cancel).

## Ветка shipment

Опциональный контур закрывающих документов отгрузки. Не является happy path и не заменяет report accept переход в completed. Не путать с денежным порядком RATE_ON_PP секции 10 и не смешивать с отдельным продуктом логистов из секции 8 вводных. Менеджер завершает заявку подтверждением отчёта без обязательной лестницы отгрузки. Статус report_accepted остаётся для Nest и ручного входа в ветку. Shipment инициируется менеджером из report_accepted payment_sent или advance_signing_order_accepted когда нужны закрывающие документы. Статусы ветки shipment_waiting shipment_waiting_verification shipment_verification shipment_waiting_corrections. Действие shipment_waiting открывает ветку. Действие shipment_upload пользователя переводит в shipment_waiting_verification. Менеджер shipment_start берёт документы в проверку. Действие shipment_accept или complete закрывает заявку в completed. Действие shipment_reject возвращает на shipment_waiting_corrections. Действие shipment_stop откатывает проверку в shipment_waiting_verification. Пользователь shipment_accept_user может закрыть заявку из shipment_verification как альтернатива менеджеру.

Покрытие: domain transitions actions status shipment unit tests shipment_test.go включая AuthZ stop reject и report_accept без отгрузки. HTTP routes manager shipment waiting start stop accept reject и site shipment upload accept. HTTP tests r5_shipment_test.go AuthZ 403 и reject stop. FE CTA Manager User ShipmentPanel actions.ts action-bridge. FE unit manager-close.test.ts. E2E @pilot-matrix pilot-matrix-shipment.spec.ts optional report complete и ветка отгрузки. Compose-e2e P5 shipment smoke. Полный флоу логистов Ожидаем информации от логистов вне scope MVP.

## Ветка provider return

prov_payment_return переводит в manager_checking. Manager уточняет и снова mgr_payment_start.

## Возврат после исполнения (новый контур)

Отдельный контур возврата импортного платежа: деньги уже исполнены провайдером и вернулись на счёт провайдера. Не смешивается с пилотным refund удержанных средств (Phase 7). Инициатор — провайдер. Вход — после payment_sent (включая report_accepted/completed). Только импорт (аванс и постоплата). Казначей не участвует.

Три ветки менеджера: вернуть клиенту (курс → письмо-согласие → рублёвая платёжка), повторить платёж (без новой заявки, контрагент не проверяется), уточнить у клиента (промежуточный шаг).

Один активный возврат на заявку. Сумма задаётся провайдером и не меняется. Клиент не инициирует и не выбирает ветку.

Детали: заметки/конструктор-сценариев/возврат-после-исполнения.txt. План: .cursor/plans/возврат_после_исполнения_d8d5706e.plan.md.

Не использовать: mgr_refund_*, payment_refund_*, FundsHeld, FundsRefunded, prov_payment_return (другая семантика).

Статусы и действия: префикс prov_return_*, mgr_return_*, client_return_*. Поля: новые на Form.ReturnEpisode (не FundsHeld/FundsRefunded).

## Nest shortcut

report/accept может перевести напрямую в completed в compose-e2e для совместимости с Nest parity path.

## Compose E2E reference path

Один form id проходит User submit, ICO, ECO, assign agent, contract, order, payment_received, assign provider, payment_start, provider_sent, report upload и accept, completed. Детали в development/testing.md. Импортные ветки аванс и RATE_ON_PP покрыты Go HTTP, FE unit, compose-e2e API journeys и Playwright @pilot-matrix (advance treasurer deadline, postpay RATE_ON_PP). Это не полный export-style compose browser ladder и не обязательный PR smoke.

Pilot happy path: report → completed. Shipment — отдельная ветка, не обязательный ladder после report accept. Manager может вести заявку в completed сразу после подтверждённого отчёта без обязательной лестницы отгрузки.

## UI projection

Fe mapStatusLabel применяет role-specific labels из copy layer RW1–RW9. Канонический id статуса один; labels различаются по роли. Исходники: vdp/fe/src/lib/ved/copy/. Роль treasurer участвует в nest prefix и CTA confirm-payment на payment_received для импорт-аванса.
