import { FormPaymentDirection, FormPaymentStatus } from '../../lib/enums/models/form-payment.enums';
import { AccountRole } from '../../lib/enums/models/account.enums';
import { SenderFormPaymentEvents } from 'lib/enums/models/sender.enums';
import { MongoosePopulate } from '../../lib/utils/mongoose/mongoose-populate';
import { IFormPayment } from '../../lib/interfaces/models/form-payment.interface';

export const FORM_PAYMENT_CLIENT = 'FORM_PAYMENT_CLIENT';
export const FORM_PAYMENT_SERVICE = 'IFormPaymentService';

export const formPaymentPopulate = new MongoosePopulate(
  'account',
  'agent',
  'provider',
  'manager',
  'docs.paymentOrder',
  'docs.paymentAdvanceOrder',
  'docs.paymentOrderSigned',
  'docs.paymentOrderDocx',
  'docs.paymentAdvanceOrderDocx',
  'docs.report',
  'docs.docxFile',
  'docs.reportSigned',
  'docs.payments',
  'docs.closing',
  'docs.archive',
  'docs.refund',
  'docs.additional',
  'contract',
  'docs.swift',
  'importFile',
);

export const transitionsImportForm = {
  [FormPaymentStatus.CREATING]: [FormPaymentStatus.DRAFT],
  [FormPaymentStatus.DRAFT]: [
    FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
  ],
  [FormPaymentStatus.FORM_WAITING_CORRECTIONS]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.FORM_WAITING_VERIFICATION,
    FormPaymentStatus.FORM_ACCEPTED,
  ],

  [FormPaymentStatus.SIGNING_ORDER]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.FORM_ACCEPTED,
  ],
  [FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
  ],

  [FormPaymentStatus.CONTRACT_WAITING_CORRECTION]: [FormPaymentStatus.CANCELED_BY_MANAGER],
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.PAYMENT_SENT,
  ],
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
  ],
  [FormPaymentStatus.SHIPMENT_WAITING]: [
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.PAYMENT_REFUND_WAITING,
  ],
  [FormPaymentStatus.CONTRACT_WAITING]: [FormPaymentStatus.CANCELED_BY_MANAGER],

  // admins
  [FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION]: [
    FormPaymentStatus.ORGANIZATION_VERIFICATION,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
  ],
  [FormPaymentStatus.ORGANIZATION_VERIFICATION]: [
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_VERIFICATION,
    FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
  ],
  [FormPaymentStatus.FORM_WAITING_VERIFICATION]: [
    FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.FORM_VERIFICATION,
  ],
  [FormPaymentStatus.FORM_VERIFICATION]: [
    FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.FORM_ACCEPTED,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_VERIFICATION,
  ],
  [FormPaymentStatus.FORM_ACCEPTED]: [
    FormPaymentStatus.SIGNING_ORDER,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
  ],
  [FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION]: [FormPaymentStatus.SIGNING_ORDER_VERIFICATION],
  [FormPaymentStatus.SIGNING_ORDER_VERIFICATION]: [
    FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
  ],
  [FormPaymentStatus.SIGNING_ORDER_ACCEPTED]: [
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.PAYMENT_REFUND_WAITING,
    FormPaymentStatus.PAYMENT_PROCESSING,
    FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.MANAGER_CHECKING,
  ],

  [FormPaymentStatus.PAYMENT_REFUND_WAITING]: [
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.PAYMENT_REFUND_PROCESSING,
  ],

  [FormPaymentStatus.PAYMENT_REFUND_PROCESSING]: [
    FormPaymentStatus.PAYMENT_REFUND_WAITING,
    FormPaymentStatus.PAYMENT_REFUND_SENT,
  ],

  [FormPaymentStatus.PAYMENT_REFUND_SENT]: [
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  ],

  // Import, postpay: after PAYMENT_SENT
  // заявка может быть возвращена менеджеру только в MANAGER_CHECKING.
  [FormPaymentStatus.PAYMENT_SENT]: [FormPaymentStatus.MANAGER_CHECKING],
  [FormPaymentStatus.CONTRACT_VERIFICATION]: [FormPaymentStatus.FORM_WAITING_CORRECTIONS],
  [FormPaymentStatus.REPORT_WAITING_VERIFICATION]: [
    FormPaymentStatus.REPORT_VERIFICATION,
    FormPaymentStatus.REPORT_ACCEPTED,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
  ],
  [FormPaymentStatus.REPORT_WAITING]: [
    FormPaymentStatus.PAYMENT_SENT,
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.REPORT_ACCEPTED,
    FormPaymentStatus.REPORT_WAITING_DIADOC, // VF-2: переход при отправке в ЭДО
  ],
  // VF-2: Промежуточный статус "отчёт на подписании в ЭДО"
  [FormPaymentStatus.REPORT_WAITING_DIADOC]: [
    FormPaymentStatus.REPORT_WAITING_VERIFICATION, // при подписании в Diadoc
    FormPaymentStatus.REPORT_WAITING_CORRECTIONS, // при отклонении или истечении срока
    FormPaymentStatus.REPORT_WAITING, // при отмене отправки в ЭДО
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
  ],
  [FormPaymentStatus.REPORT_VERIFICATION]: [
    FormPaymentStatus.REPORT_WAITING_VERIFICATION,
    FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.REPORT_ACCEPTED,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  ],

  // После возврата провайдером менеджеру (MANAGER_CHECKING)
  // допустим только переход обратно в PAYMENT_PROCESSING
  // или отмена заявки.
  [FormPaymentStatus.MANAGER_CHECKING]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.PAYMENT_PROCESSING,
  ],
  [FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION]: [
    FormPaymentStatus.SHIPMENT_VERIFICATION,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  ],
  [FormPaymentStatus.SHIPMENT_VERIFICATION]: [
    FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
    FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.COMPLETED,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  ],

  // провайдер
  [FormPaymentStatus.PAYMENT_RECEIVED]: [
    FormPaymentStatus.PAYMENT_PROCESSING,
    FormPaymentStatus.MANAGER_CHECKING,
    FormPaymentStatus.REPORT_WAITING,
    FormPaymentStatus.REPORT_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER,
  ],
  [FormPaymentStatus.PAYMENT_PROCESSING]: [
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.MANAGER_CHECKING,
    FormPaymentStatus.PAYMENT_SENT,
    FormPaymentStatus.PAYMENT_SENT_TREASURER,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
  ],
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED]: [
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.PAYMENT_PROCESSING,
    FormPaymentStatus.MANAGER_CHECKING,
  ],
  [FormPaymentStatus.PAYMENT_SENT_TREASURER]: [FormPaymentStatus.SIGNING_ORDER_TREASURER],
  [FormPaymentStatus.SIGNING_ORDER_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
    FormPaymentStatus.PAYMENT_SENT_TREASURER,
  ],
  [FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER]: [
    FormPaymentStatus.PAYMENT_SENT,
    FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
  ],
  [FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_TREASURER,
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
  ],
};

// Additional transitions for rate-on-provider postpay (postpay_rate_on_pp) after PAYMENT_SENT:
// разрешаем цикл доп. поручения по рублевому покрытию и ручное подтверждение оплаты.
export const transitionsImportFormRateOnProviderPostpay: Partial<Record<FormPaymentStatus, FormPaymentStatus[]>> = {
  [FormPaymentStatus.PAYMENT_SENT]: [
    FormPaymentStatus.ADVANCE_SIGNING_ORDER,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.PAYMENT_RECEIVED,
  ],
};

export const transitionsExportForm = {
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION]: [
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
  ],
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION]: [
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
  ],
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED]: [
    FormPaymentStatus.PAYMENT_PROCESSING,
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.PAYMENT_REFUND_WAITING,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.CANCELED_BY_MANAGER,
  ],
  [FormPaymentStatus.PAYMENT_PROCESSING]: [FormPaymentStatus.PAYMENT_SENT, FormPaymentStatus.PAYMENT_SENT_TREASURER],
  [FormPaymentStatus.PAYMENT_RECEIVED]: [
    FormPaymentStatus.ADVANCE_SIGNING_ORDER,
    FormPaymentStatus.PAYMENT_PROCESSING,
    FormPaymentStatus.REPORT_ACCEPTED,
  ],
  // Для экспортных/прочих сценариев сохраняем более широкий набор
  // допустимых переходов из PAYMENT_SENT, чтобы не ломать существующие флоу.
  [FormPaymentStatus.PAYMENT_SENT]: [
    FormPaymentStatus.REPORT_WAITING,
    FormPaymentStatus.REPORT_ACCEPTED,
    FormPaymentStatus.MANAGER_CHECKING,
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.PAYMENT_REFUND_WAITING,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
  ],
  [FormPaymentStatus.MANAGER_CHECKING]: [
    FormPaymentStatus.CANCELED_BY_MANAGER,
    FormPaymentStatus.CANCELED_BY_USER,
    FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
    FormPaymentStatus.PAYMENT_RECEIVED,
    FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  ],
  [FormPaymentStatus.SIGNING_ORDER_ACCEPTED]: [FormPaymentStatus.MANAGER_CHECKING, FormPaymentStatus.PAYMENT_RECEIVED],
  [FormPaymentStatus.PAYMENT_SENT_TREASURER]: [FormPaymentStatus.SIGNING_ORDER_TREASURER],
  [FormPaymentStatus.SIGNING_ORDER_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
    FormPaymentStatus.PAYMENT_SENT_TREASURER,
  ],
  [FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER]: [
    FormPaymentStatus.PAYMENT_SENT,
    FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
  ],
  [FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_TREASURER,
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
  ],
};

// не хватает REPORT_WAITING_CORRECTIONS, CONTRACT_WAITING, CONTRACT_WAITING_CORRECTION, CONTRACT_VERIFICATION
export const eventsHash = {
  [FormPaymentStatus.COMPLETED]: {
    [AccountRole.USER]: SenderFormPaymentEvents.COMPLETED,
  },
  [FormPaymentStatus.CANCELED_BY_MANAGER]: {
    [AccountRole.USER]: SenderFormPaymentEvents.CANCELED_BY_ADMIN,
  },
  [FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER]: {
    [AccountRole.USER]: SenderFormPaymentEvents.CANCELED_BY_COMPLIANCE_OFFICER,
  },
  [FormPaymentStatus.CANCELED_BY_USER]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.CANCELED_BY_USER,
  },
  [FormPaymentStatus.FORM_ACCEPTED]: {
    [AccountRole.USER]: {
      oldStatus: {
        [FormPaymentStatus.FORM_VERIFICATION]: SenderFormPaymentEvents.FORM_ACCEPTED,
        [FormPaymentStatus.CONTRACT_VERIFICATION]: SenderFormPaymentEvents.ACCEPT_CONTRACT,
      },
    },
  },
  [FormPaymentStatus.FORM_WAITING_VERIFICATION]: {
    [AccountRole.USER]: SenderFormPaymentEvents.USER_ACCEPTED_FORM,
    [AccountRole.MANAGER]: SenderFormPaymentEvents.USER_ACCEPTED_FORM,
  },
  [FormPaymentStatus.FORM_WAITING_CORRECTIONS]: {
    [AccountRole.USER]: SenderFormPaymentEvents.MANAGER_REJECT_FORM,
  },
  [FormPaymentStatus.SIGNING_ORDER]: {
    [AccountRole.USER]: SenderFormPaymentEvents.SIGNING_ORDER,
  },
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER]: {
    [AccountRole.USER]: SenderFormPaymentEvents.SIGNING_ORDER,
  },
  [FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS]: {
    [AccountRole.USER]: SenderFormPaymentEvents.REJECT_ORDER,
  },
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS]: {
    [AccountRole.USER]: SenderFormPaymentEvents.REJECT_ORDER,
  },
  [FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.ORDER_SIGN_UPLOADED,
  },
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.ORDER_SIGN_UPLOADED,
  },
  [FormPaymentStatus.SIGNING_ORDER_ACCEPTED]: {
    [AccountRole.USER]: SenderFormPaymentEvents.ORDER_ACCEPT,
  },
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED]: {
    [AccountRole.USER]: SenderFormPaymentEvents.ORDER_ACCEPT,
  },
  [FormPaymentStatus.PAYMENT_RECEIVED]: {
    [AccountRole.USER]: {
      import: SenderFormPaymentEvents.PAYMENT_RECEIVED_IMPORT,
      export: SenderFormPaymentEvents.PAYMENT_RECEIVED_EXPORT,
    },
  },
  [FormPaymentStatus.PAYMENT_SENT]: {
    [AccountRole.USER]: SenderFormPaymentEvents.PAYMENT_SENT,
  },
  [FormPaymentStatus.REPORT_WAITING]: {
    [AccountRole.USER]: SenderFormPaymentEvents.REPORT_WAITING,
  },
  // VF-2: Событие для промежуточного статуса "отчёт на подписании в ЭДО"
  [FormPaymentStatus.REPORT_WAITING_DIADOC]: {
    [AccountRole.USER]: SenderFormPaymentEvents.REPORT_WAITING_DIADOC,
  },
  [FormPaymentStatus.REPORT_WAITING_VERIFICATION]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.REPORT_SIGN_UPLOADED,
  },
  [FormPaymentStatus.SHIPMENT_WAITING]: {
    [AccountRole.USER]: SenderFormPaymentEvents.SHIPMENT_WAITING,
  },
  [FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS]: {
    [AccountRole.USER]: SenderFormPaymentEvents.SHIPMENT_WAITING_CORRECTIONS,
  },
  [FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.SHIPMENT_UPLOADED,
  },
  [FormPaymentStatus.MANAGER_CHECKING]: {
    [AccountRole.MANAGER]: SenderFormPaymentEvents.MANAGER_CHECKING,
  },
  [FormPaymentStatus.PAYMENT_REFUND_WAITING]: {
    [AccountRole.USER]: {
      oldStatus: {
        [FormPaymentStatus.SIGNING_ORDER_ACCEPTED]: SenderFormPaymentEvents.REFUND_WAITING,
      },
    },
  },
  [FormPaymentStatus.PAYMENT_REFUND_SENT]: {
    [AccountRole.USER]: SenderFormPaymentEvents.REFUND_SENT,
  },
};

export const mapEventFormPayment: Partial<{ [key in SenderFormPaymentEvents]: Partial<IFormPayment> }> = {
  [SenderFormPaymentEvents.ORGANIZATION_WAITING_VERIFICATION]: {
    status: FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
  },
  [SenderFormPaymentEvents.USER_ACCEPTED_FORM]: { status: FormPaymentStatus.FORM_WAITING_VERIFICATION },
  [SenderFormPaymentEvents.ORDER_ACCEPT]: {
    prevStatus: FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
    status: FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
  },
  [SenderFormPaymentEvents.FORM_ACCEPTED]: { status: FormPaymentStatus.FORM_ACCEPTED },
  [SenderFormPaymentEvents.ORDER_SIGN_UPLOADED]: { status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION },
  [SenderFormPaymentEvents.MANAGER_CHECKING]: { status: FormPaymentStatus.MANAGER_CHECKING },
  [SenderFormPaymentEvents.PAYMENT_SENT]: {
    direction: FormPaymentDirection.IMPORT,
    status: FormPaymentStatus.PAYMENT_SENT,
  },
  [SenderFormPaymentEvents.PAYMENT_RECEIVED]: {
    direction: FormPaymentDirection.EXPORT,
    status: FormPaymentStatus.PAYMENT_RECEIVED,
  },
  [SenderFormPaymentEvents.REPORT_SIGN_UPLOADED]: { status: FormPaymentStatus.REPORT_WAITING_VERIFICATION },
  [SenderFormPaymentEvents.ACCEPT_CONTRACT]: { status: FormPaymentStatus.CONTRACT_VERIFICATION },
  [SenderFormPaymentEvents.PAYMENT_REJECTED]: {
    prevStatus: FormPaymentStatus.PAYMENT_PROCESSING,
    status: FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
  },
};

export const formPaymentCancellationStatuses = [
  FormPaymentStatus.CANCELED_BY_USER,
  FormPaymentStatus.CANCELED_BY_MANAGER,
  FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
];
