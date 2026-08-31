import type { CoreForm } from "./forms";
import { apiFetch } from "./client";

export type RefundView = {
  form_payment_id?: string;
  status: string;
  funds_held?: boolean;
  funds_refunded?: boolean;
  received_amount?: string;
  received_currency?: string;
  amount?: string;
  currency?: string;
  refund_amount?: string;
  refund_currency?: string;
  comment?: string;
  file_id?: string;
  refund_file_id?: string;
  can_cancel_form?: boolean;
  unrefunded_blocks_cancel?: boolean;
};

export function getRefund(formId: string): Promise<RefundView> {
  return apiFetch<RefundView>(`/api/v1/forms/${formId}/refund`);
}

export function initRefund(
  formId: string,
  input: { amount: string; currency: string; comment?: string },
): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/init`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function attachRefundFile(formId: string, fileId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/file`, {
    method: "POST",
    body: JSON.stringify({ file_id: fileId }),
  });
}

export function confirmRefundSent(formId: string, comment?: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/sent`, {
    method: "POST",
    body: JSON.stringify({ comment: comment ?? "" }),
  });
}

export function refundStart(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/start`, { method: "POST", body: "{}" });
}

export function refundStop(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/stop`, { method: "POST", body: "{}" });
}

export function refundCancel(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/cancel`, { method: "POST", body: "{}" });
}
