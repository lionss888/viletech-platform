export enum FormPaymentPattern {
  UPDATE_ONE = 'fea360.form.payment.update.one',
  UPDATE_MANY = 'fea360.form.payment.update.many',
  FIND_ONE = 'fea360.form.payment.find.one',
  FIND_MANY = 'fea360.form.payment.find.many',
  FIND_ONE_OR_EXCEPTION = 'fea360.form.payment.find.one.or.exception',
  GENERATE_AGENT_REPORT = 'fea360.form.payment.generate.agent.report',
  SEND_UPDATE_NOTIFICATIONS = 'fea360.form.payment.send.update.notifications',
  SYNC_ORGANIZATION_SUBACCOUNTS = 'fea360.form.payment.sync.organization.subaccounts',
  PARSE_EXCEL = 'parse-excel',
  APPLY_PAYMENT_FROM_PAYMENT_SERVICE = 'fea360.form.payment.apply.payment',

  // миграции
  MIGRATION_UPDATE_DOCS_REFUND_FIELD_TYPE = 'fea360.form.payment.migration.update.docs.refund.field.type',
}

export enum CounterpartyEnrichmentContext {
  ORDER = 'order',
  MANAGER = 'manager',
  SITE = 'site',
}

export enum FormPaymentStatus {
  CREATING = 'creating', // заявка создана, началось автоматическое распознование
  DRAFT = 'draft', // распознование закончено, клиент можнет редактировать заявку

  ORGANIZATION_WAITING_VERIFICATION = 'organization_waiting_verification', // клиент отправил заявку на проверку, ожидается проверка организации внутренним комплаенс офицером
  ORGANIZATION_VERIFICATION = 'organization_verification', // внутренний комплаенс офицер начал проверку организации

  FORM_WAITING_VERIFICATION = 'form_waiting_verification', // клиент отправил заявку на проверку, ожидается проверка комплаенс офицером
  FORM_WAITING_CORRECTIONS = 'form_waiting_corrections', // клиенту вернули заявку на коррекцию
  FORM_VERIFICATION = 'form_verification', // комплаенс офицер начал проверку

  FORM_ACCEPTED = 'form_accepted', // комплаенс офицер подтвердил заявку

  SIGNING_ORDER = 'signing_order', // менеджер отправил сформированное(или загруженное) поручение клиенту на подпись
  SIGNING_ORDER_WAITING_VERIFICATION = 'signing_order_waiting_verification', // клиент загрузил поручение, ожидается проверка менеджером
  SIGNING_ORDER_WAITING_CORRECTIONS = 'signing_order_waiting_corrections', // поручение ожидает коррекции со стороны клиента
  SIGNING_ORDER_VERIFICATION = 'signing_order_verification', // менеджер начал проверку поручения
  SIGNING_ORDER_ACCEPTED = 'signing_order_accepted', // менеджер подтвердил поручение

  // дополнительное поручение, тоже самое что и обычное поручение
  ADVANCE_SIGNING_ORDER = 'advance_signing_order',
  ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION = 'advance_signing_order_waiting_verification',
  ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS = 'advance_signing_order_waiting_corrections',
  ADVANCE_SIGNING_ORDER_VERIFICATION = 'advance_signing_order_verification',
  ADVANCE_SIGNING_ORDER_ACCEPTED = 'advance_signing_order_accepted',

  PAYMENT_RECEIVED = 'payment_received', // менеджер(или провайдер) подтвердил получение средств со стороны клиента(контрагента)
  PAYMENT_PROCESSING = 'payment_processing', // провайдер(менеджер) начал исполнение конечного платежа на контрагента(клиента)
  PAYMENT_SENT = 'payment_sent', // конечный платеж на контрагента(клиента) отправлен

  REPORT_WAITING = 'report_waiting', // менеджер отправил отчет клиенту на подписание
  REPORT_WAITING_DIADOC = 'report_waiting_diadoc', // VF-2: отчёт отправлен на подписание в ЭДО (Diadoc)
  REPORT_WAITING_VERIFICATION = 'report_waiting_verification', // клиент загрузил отчет, ожидается проверка менеджером
  REPORT_WAITING_CORRECTIONS = 'report_waiting_corrections', // отчет ожидает коррекции со стороны клиента
  REPORT_VERIFICATION = 'report_verification', // менеджер начал проверку отчета
  REPORT_ACCEPTED = 'report_accepted', // менеджер подтвердил отчет

  SHIPMENT_WAITING = 'shipment_waiting', // ожидание загрузки документов об отгрузке от клиента
  SHIPMENT_WAITING_VERIFICATION = 'shipment_waiting_verification', // клиент загрузил доки об отгрузке, ожидается проверка менеджером
  SHIPMENT_WAITING_CORRECTIONS = 'shipment_waiting_corrections', // доки об отгрузке ожидает коррекции со стороны клиента
  SHIPMENT_VERIFICATION = 'shipment_verification', // менеджер проверяет доки об отгрузке

  MANAGER_CHECKING = 'manager_checking', // провайдер вернул заявку менеджеру для уточнения

  CONTRACT_WAITING = 'contract_waiting', // ожидается загрузка подписанного агентского договора клиентом
  CONTRACT_WAITING_CORRECTION = 'contract_waiting_correction', // договор ожидает коррекции со стороны клиента
  CONTRACT_VERIFICATION = 'contract_verification', // договор загружен, ожидается проверка менеджером

  PAYMENT_REFUND_WAITING = 'payment_refund_waiting', // Ожидается возврат денежных средств
  PAYMENT_REFUND_PROCESSING = 'payment_refund_processing', // возврат денежных средств в процессе
  PAYMENT_REFUND_SENT = 'payment_refund_sent', // возврат денежных средств завершен

  PAYMENT_SENT_TREASURER = 'payment_sent_treasurer', // казначей отправил платеж
  SIGNING_ORDER_TREASURER = 'signing_order_treasurer', // казначей отправил поручение на подпись
  SIGNING_ORDER_VERIFICATION_TREASURER = 'signing_order_verification_treasurer', // казначей проверяет поручение
  ORDER_WAITING_CORRECTION_TREASURER = 'order_waiting_correction_treasurer', // поручение ожидает коррекции от клиента

  OVERPAYMENT_EXPORT = 'overpayment_export', // сумма экспортных сделок превышает сумму импортной
  OVERPAYMENT_IMPORT = 'overpayment_import', // сумма импортной сделки равна или больше суммы экспортных
  EQUAL = 'equal', // суммы импортной и экспортных сделок равны (для paymentMethod = pay_from_export)

  COMPLETED = 'completed', // заявка успешно закрыта
  CANCELED_BY_USER = 'canceled_by_user', // заявка отменена
  CANCELED_BY_MANAGER = 'canceled_by_manager', // заявка отменена
  CANCELED_BY_COMPLIANCE_OFFICER = 'canceled_by_compliance_officer', // заявка отменена
  CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER = 'canceled_by_internal_compliance_officer', // заявка отменена
}

export enum FormPaymentStage {
  NEW = 'new', // Новая заявка
  ORGANIZATION_VERIFICATION = 'organization_verification', // Проверка внутренним комплаенсом
  FORM_VERIFICATION = 'form_verification', // Проверка внешним комплаенсом
  AGENCY_CONTRACT = 'agency_contract', // Контракт с агентом
  SIGNING_ORDER = 'signing_order', // Поручение принципала
  ADVANCE_SIGNING_ORDER = 'advance_signing_order', // Дополнительное поручение принципала
  WAITING_PAYMENT_FROM_CLIENT = 'waiting_payment_from_client', // Ожидание платежа от клиента
  SENDING_PAYMENT_TO_CLIENT = 'sending_payment_to_client', // Отправка средств клиенту
  WAITING_PAYMENT_FROM_COUNTERPARTY = 'waiting_payment_from_counterparty', // Ожидание платежа от контрагента
  SENDING_PAYMENT_TO_COUNTERPARTY = 'sending_payment_to_counterparty', // Отправка средств контрагенту
  AGENT_REPORT = 'agent_report', // Отчет агента
  SHIPMENT = 'shipment', // Документы об отгрузке
  COMPLETED = 'completed', // Заявка завершена
  REFUND = 'refund', // Возврат средств
  CANCELED = 'canceled', // Заявка отменена
}

export enum FormPaymentStatusUpdateByUser {
  WAITING_VERIFICATION = 'waiting_verification',
}

export enum FormPaymentStatusPaymentSent {
  PAYMENT_SENT = 'payment_sent',
}

export enum FormPaymentDirection {
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum FormPaymentKind {
  GOOD = 'good',
  SERVICE = 'service',
}

export enum FormPaymentCondition {
  ADVANCE = 'advance', // аванс
  POST_PAYMENT = 'postPayment', // постоплата
}

export enum PlatformPostpayMode {
  POSTPAY_FIXED_RATE = 'postpay_fixed_rate',
  POSTPAY_RATE_ON_PP = 'postpay_rate_on_pp',
  LEGACY = 'legacy',
}

export enum ChatGptStatus {
  PENDING = 'pending', // анализ в процессе
  COMPLETED = 'completed', // анализ завершен успешно
  REJECT = 'reject', // анализ отклонен (произошла ошибка при анализе)
}

export enum FormPaymentPaymentMethod {
  PAY_FROM_EXPORT = 'pay_from_export', // оплатить из экспорта
  PAY_IN_RUBLES = 'pay_in_rubles', // оплатить в рублях
}
