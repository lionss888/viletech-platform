import { FormPaymentStatus, FormPaymentStage } from 'lib/enums/models/form-payment.enums';

export const INTERNAL_PENDING_STATUSES = [
  FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
  FormPaymentStatus.ORGANIZATION_VERIFICATION,
] as const;

export const INTERNAL_APPROVED_STAGES = [
  FormPaymentStage.FORM_VERIFICATION,
  FormPaymentStage.AGENCY_CONTRACT,
  FormPaymentStage.SIGNING_ORDER,
  FormPaymentStage.ADVANCE_SIGNING_ORDER,
  FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT,
  FormPaymentStage.SENDING_PAYMENT_TO_CLIENT,
  FormPaymentStage.WAITING_PAYMENT_FROM_COUNTERPARTY,
  FormPaymentStage.SENDING_PAYMENT_TO_COUNTERPARTY,
  FormPaymentStage.AGENT_REPORT,
  FormPaymentStage.SHIPMENT,
  FormPaymentStage.COMPLETED,
  FormPaymentStage.REFUND,
] as const;

export const INTERNAL_CANCELED_STATUSES = [
  FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_USER,
] as const;

export const INTERNAL_REJECTED_STATUSES = [FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER] as const;

export const INTERNAL_OTHER_STATUSES = [
  FormPaymentStatus.DRAFT,
  FormPaymentStatus.CREATING,
  FormPaymentStatus.CANCELED_BY_USER,
] as const;

export const EXTERNAL_PENDING_STATUSES = [
  FormPaymentStatus.FORM_WAITING_VERIFICATION,
  FormPaymentStatus.FORM_VERIFICATION,
] as const;

export const EXTERNAL_APPROVED_STAGES = [
  FormPaymentStage.AGENCY_CONTRACT,
  FormPaymentStage.SIGNING_ORDER,
  FormPaymentStage.ADVANCE_SIGNING_ORDER,
  FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT,
  FormPaymentStage.SENDING_PAYMENT_TO_CLIENT,
  FormPaymentStage.WAITING_PAYMENT_FROM_COUNTERPARTY,
  FormPaymentStage.SENDING_PAYMENT_TO_COUNTERPARTY,
  FormPaymentStage.AGENT_REPORT,
  FormPaymentStage.SHIPMENT,
  FormPaymentStage.COMPLETED,
  FormPaymentStage.REFUND,
] as const;

export const EXTERNAL_CANCELED_STATUSES = [
  FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
  FormPaymentStatus.CANCELED_BY_USER,
] as const;

export const EXTERNAL_REJECTED_STATUSES = [FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER] as const;
