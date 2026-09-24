// Return episode API (новый контур возврата после исполнения).

import { ApiError, apiFetch } from "./client";

export interface RateHistoryEntry {
  rate: string;
  set_at: string;
  set_by: string;
}

export interface ReturnEpisode {
  active: boolean;
  reported_amount?: string;
  reported_currency?: string;
  reason?: string;
  reported_by?: string;
  reported_at?: string;
  // Stage 2: Clarify cycle
  clarify_question?: string;
  clarify_file_id?: string;
  clarify_asked_at?: string;
  clarify_asked_by?: string;
  clarify_answer?: string;
  clarify_answer_file_id?: string;
  clarify_answered_at?: string;
  clarify_answered_by?: string;
  clarify_cycle_count?: number;
  // Stage 3: Return to client
  to_client_rate?: string;
  to_client_rate_history?: RateHistoryEntry[];
  to_client_rate_set_at?: string;
  to_client_rate_set_by?: string;
  client_consent_file_id?: string;
  client_consent_given_at?: string;
  client_consent_given_by?: string;
  client_refusal_reason?: string;
  client_refused_at?: string;
  to_client_rub_payment_file_id?: string;
  to_client_executed_at?: string;
  to_client_executed_by?: string;
  to_client_closed?: boolean;
  // Stage 4: Repeat payment
  repeat_comment?: string;
  repeat_initiated_at?: string;
  repeat_initiated_by?: string;
  repeat_provider_org_changed?: boolean;
  repeat_new_provider_org_id?: string;
  repeat_new_account_id?: string;
  repeat_executed_at?: string;
  repeat_executed_by?: string;
  repeat_payment_file_id?: string;
  repeat_closed?: boolean;
}

export interface ProvReturnReportRequest {
  amount: string;
  currency?: string;
  reason?: string;
}

export interface MgrReturnClarifyRequest {
  question: string;
  file_id?: string;
}

export interface ClientReturnClarifyReplyRequest {
  answer: string;
  file_id?: string;
}

export interface MgrReturnToClientRateRequest {
  rate: string;
}

export interface ClientReturnConsentRequest {
  consent_file_id: string;
}

export interface ClientReturnRefuseRequest {
  reason: string;
}

export interface MgrReturnToClientExecuteRequest {
  rub_payment_file_id: string;
}

export interface MgrReturnRepeatRequest {
  comment: string;
  new_provider_org_id?: string;
  new_account_id?: string;
}

export interface ProvReturnRepeatExecuteRequest {
  payment_file_id: string;
}

/**
 * Get return episode for a form.
 * Core returns 200 with active:false when none; 404→null kept as a defensive edge.
 */
export async function getReturnEpisode(formId: string): Promise<ReturnEpisode | null> {
  try {
    return await apiFetch<ReturnEpisode>(`/api/v1/forms/${formId}/return/episode`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** Provider reports return after payment execution (stage 1). */
export function provReturnReport(
  formId: string,
  data: ProvReturnReportRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/report`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Manager asks client for clarification (stage 2). */
export function mgrReturnClarify(
  formId: string,
  data: MgrReturnClarifyRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/clarify`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Client replies to manager's clarification question (stage 2). */
export function clientReturnClarifyReply(
  formId: string,
  data: ClientReturnClarifyReplyRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/clarify-reply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Manager sets exchange rate for return to client (stage 3). */
export function mgrReturnToClientRate(
  formId: string,
  data: MgrReturnToClientRateRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/to-client/rate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Client gives consent with letter (stage 3). */
export function clientReturnConsent(
  formId: string,
  data: ClientReturnConsentRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/to-client/consent`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Client refuses rate with reason (stage 3). */
export function clientReturnRefuse(
  formId: string,
  data: ClientReturnRefuseRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/to-client/refuse`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Manager executes RUB payment (stage 3). */
export function mgrReturnToClientExecute(
  formId: string,
  data: MgrReturnToClientExecuteRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/to-client/execute`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Manager initiates repeat payment (stage 4). */
export function mgrReturnRepeat(
  formId: string,
  data: MgrReturnRepeatRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/repeat`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Provider executes repeat payment (stage 4). */
export function provReturnRepeatExecute(
  formId: string,
  data: ProvReturnRepeatExecuteRequest,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/forms/${formId}/return/repeat/execute`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
