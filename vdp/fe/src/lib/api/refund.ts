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

/** POST /api/v1/forms/{…}/refund. */
export function getRefund(formId: string): Promise<RefundView> {
  return apiFetch<RefundView>(`/api/v1/forms/${formId}/refund`);
}

/** POST /api/v1/forms/{…}/refund/init. */
export function initRefund(
  formId: string,
  input: { amount: string; currency: string; comment?: string },
): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/init`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /api/v1/forms/{…}/refund/file. */
export function attachRefundFile(formId: string, fileId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/file`, {
    method: "POST",
    body: JSON.stringify({ file_id: fileId }),
  });
}

/** POST /api/v1/forms/{…}/refund/sent. */
export function confirmRefundSent(formId: string, comment?: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/sent`, {
    method: "POST",
    body: JSON.stringify({ comment: comment ?? "" }),
  });
}

/** POST /api/v1/forms/{…}/refund/start. */
export function refundStart(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/start`, { method: "POST", body: "{}" });
}

/** POST /api/v1/forms/{…}/refund/stop. */
export function refundStop(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/stop`, { method: "POST", body: "{}" });
}

/** POST /api/v1/forms/{…}/refund/cancel. */
export function refundCancel(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/refund/cancel`, { method: "POST", body: "{}" });
}
