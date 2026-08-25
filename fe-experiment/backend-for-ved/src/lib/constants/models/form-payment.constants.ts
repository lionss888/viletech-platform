import { FormPaymentDirection } from '../../enums/models/form-payment.enums';

export const FormPaymentDirectionTranslates = {
  [FormPaymentDirection.EXPORT]: 'Экспорт',
  [FormPaymentDirection.IMPORT]: 'Импорт',
};

import { FormPaymentStage, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';

export type StageHash = Map<
  FormPaymentStage,
  Array<FormPaymentStatus | { status: FormPaymentStatus; prevStatus: FormPaymentStatus[] }>
>;

// Общие статусы
const newStageStatuses = [FormPaymentStatus.CREATING, FormPaymentStatus.DRAFT];

const organizationVerificationStatuses = [
  FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
  FormPaymentStatus.ORGANIZATION_VERIFICATION,
  {
    status: FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    prevStatus: [FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION, FormPaymentStatus.ORGANIZATION_VERIFICATION],
  },
];

const formVerificationStatuses = [
  FormPaymentStatus.FORM_WAITING_VERIFICATION,
  FormPaymentStatus.FORM_VERIFICATION,
  {
    status: FormPaymentStatus.FORM_WAITING_CORRECTIONS,
    prevStatus: [FormPaymentStatus.FORM_WAITING_VERIFICATION, FormPaymentStatus.FORM_VERIFICATION],
  },
];

const agencyContractStatuses = [
  FormPaymentStatus.CONTRACT_WAITING,
  FormPaymentStatus.CONTRACT_WAITING_CORRECTION,
  FormPaymentStatus.CONTRACT_VERIFICATION,
];

const signingOrderStatuses = [
  FormPaymentStatus.FORM_ACCEPTED,
  FormPaymentStatus.SIGNING_ORDER,
  FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
  FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
  FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
  FormPaymentStatus.FORM_WAITING_CORRECTIONS,
];

const agentReportStatuses = [
  FormPaymentStatus.PAYMENT_SENT,
  FormPaymentStatus.REPORT_WAITING,
  FormPaymentStatus.REPORT_WAITING_VERIFICATION,
  FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
  FormPaymentStatus.REPORT_VERIFICATION,
];

const shipmentStatuses = [
  FormPaymentStatus.REPORT_ACCEPTED,
  FormPaymentStatus.SHIPMENT_WAITING,
  FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
  FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
  FormPaymentStatus.SHIPMENT_VERIFICATION,
];

const completedStatuses = [FormPaymentStatus.COMPLETED, FormPaymentStatus.PAYMENT_REFUND_SENT];

const refundStatuses = [FormPaymentStatus.PAYMENT_REFUND_WAITING, FormPaymentStatus.PAYMENT_REFUND_PROCESSING];

const canceledStatuses = [
  FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_USER,
  FormPaymentStatus.CANCELED_BY_MANAGER,
];

export const importAdvanceStagesHash: StageHash = new Map([
  [FormPaymentStage.NEW, newStageStatuses],
  [FormPaymentStage.ORGANIZATION_VERIFICATION, organizationVerificationStatuses],
  [FormPaymentStage.FORM_VERIFICATION, formVerificationStatuses],
  [FormPaymentStage.AGENCY_CONTRACT, agencyContractStatuses],
  [FormPaymentStage.SIGNING_ORDER, signingOrderStatuses],
  [FormPaymentStage.ADVANCE_SIGNING_ORDER, []],
  [FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT, [FormPaymentStatus.SIGNING_ORDER_ACCEPTED]],
  [FormPaymentStage.SENDING_PAYMENT_TO_CLIENT, []],
  [FormPaymentStage.WAITING_PAYMENT_FROM_COUNTERPARTY, []],
  [
    FormPaymentStage.SENDING_PAYMENT_TO_COUNTERPARTY,
    [FormPaymentStatus.PAYMENT_RECEIVED, FormPaymentStatus.PAYMENT_PROCESSING, FormPaymentStatus.MANAGER_CHECKING],
  ],
  [FormPaymentStage.AGENT_REPORT, agentReportStatuses],
  [FormPaymentStage.SHIPMENT, shipmentStatuses],
  [FormPaymentStage.COMPLETED, completedStatuses],
  [FormPaymentStage.REFUND, refundStatuses],
  [FormPaymentStage.CANCELED, canceledStatuses],
]);

export const importPostpayStagesHash: StageHash = new Map([
  [FormPaymentStage.NEW, newStageStatuses],
  [FormPaymentStage.ORGANIZATION_VERIFICATION, organizationVerificationStatuses],
  [FormPaymentStage.FORM_VERIFICATION, formVerificationStatuses],
  [FormPaymentStage.AGENCY_CONTRACT, agencyContractStatuses],
  [FormPaymentStage.SIGNING_ORDER, signingOrderStatuses],
  [
    FormPaymentStage.ADVANCE_SIGNING_ORDER,
    [
      FormPaymentStatus.ADVANCE_SIGNING_ORDER,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
    ],
  ],
  [
    FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT,
    [
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.PAYMENT_SENT,
      {
        status: FormPaymentStatus.MANAGER_CHECKING,
        prevStatus: [FormPaymentStatus.PAYMENT_SENT, FormPaymentStatus.PAYMENT_PROCESSING],
      },
      {
        status: FormPaymentStatus.PAYMENT_PROCESSING,
        prevStatus: [FormPaymentStatus.PAYMENT_SENT, FormPaymentStatus.MANAGER_CHECKING],
      },
    ],
  ],
  [FormPaymentStage.SENDING_PAYMENT_TO_CLIENT, []],
  [FormPaymentStage.WAITING_PAYMENT_FROM_COUNTERPARTY, []],
  [
    FormPaymentStage.SENDING_PAYMENT_TO_COUNTERPARTY,
    [
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.PAYMENT_PROCESSING,
      FormPaymentStatus.MANAGER_CHECKING,
    ],
  ],
  [
    FormPaymentStage.AGENT_REPORT,
    [
      FormPaymentStatus.PAYMENT_RECEIVED,
      FormPaymentStatus.REPORT_WAITING,
      FormPaymentStatus.REPORT_WAITING_VERIFICATION,
      FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
      FormPaymentStatus.REPORT_VERIFICATION,
    ],
  ],
  [FormPaymentStage.SHIPMENT, shipmentStatuses],
  [FormPaymentStage.COMPLETED, completedStatuses],
  [FormPaymentStage.REFUND, refundStatuses],
  [FormPaymentStage.CANCELED, canceledStatuses],
]);

export const exportStagesHash: StageHash = new Map([
  [FormPaymentStage.NEW, newStageStatuses],
  [FormPaymentStage.ORGANIZATION_VERIFICATION, organizationVerificationStatuses],
  [FormPaymentStage.FORM_VERIFICATION, formVerificationStatuses],
  [FormPaymentStage.AGENCY_CONTRACT, agencyContractStatuses],
  [FormPaymentStage.SIGNING_ORDER, signingOrderStatuses],
  [
    FormPaymentStage.WAITING_PAYMENT_FROM_COUNTERPARTY,
    [FormPaymentStatus.SIGNING_ORDER_ACCEPTED, FormPaymentStatus.MANAGER_CHECKING],
  ],
  [
    FormPaymentStage.ADVANCE_SIGNING_ORDER,
    [
      {
        status: FormPaymentStatus.PAYMENT_RECEIVED,
        prevStatus: [FormPaymentStatus.SIGNING_ORDER_ACCEPTED, FormPaymentStatus.DRAFT],
      },
      FormPaymentStatus.ADVANCE_SIGNING_ORDER,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
    ],
  ],
  [FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT, []],
  [
    FormPaymentStage.SENDING_PAYMENT_TO_CLIENT,
    [
      {
        status: FormPaymentStatus.PAYMENT_RECEIVED,
        prevStatus: [
          FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
          FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
        ],
      },
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.PAYMENT_PROCESSING,
    ],
  ],
  [FormPaymentStage.SENDING_PAYMENT_TO_COUNTERPARTY, []],
  [FormPaymentStage.AGENT_REPORT, agentReportStatuses],
  [FormPaymentStage.SHIPMENT, shipmentStatuses],
  [FormPaymentStage.COMPLETED, completedStatuses],
  [FormPaymentStage.REFUND, refundStatuses],
  [FormPaymentStage.CANCELED, canceledStatuses],
]);
