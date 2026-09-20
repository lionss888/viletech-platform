// Return episode API (новый контур возврата после исполнения).

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
 * Returns null if no return episode exists yet.
 */
export async function getReturnEpisode(formId: string): Promise<ReturnEpisode | null> {
  const response = await fetch(`/api/v1/forms/${formId}/return/episode`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to get return episode: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Provider reports return after payment execution (stage 1).
 * Guards: import only, after execution, one active episode.
 */
export async function provReturnReport(
  formId: string,
  data: ProvReturnReportRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to report return: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Manager asks client for clarification (stage 2).
 * Guards: episode active, only manager, question required.
 */
export async function mgrReturnClarify(
  formId: string,
  data: MgrReturnClarifyRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to clarify: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Client replies to manager's clarification question (stage 2).
 * Guards: episode active, only client (form owner), answer required.
 */
export async function clientReturnClarifyReply(
  formId: string,
  data: ClientReturnClarifyReplyRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/clarify-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to reply: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Manager sets exchange rate for return to client (stage 3).
 * Guards: episode active, only manager, rate required and valid decimal.
 */
export async function mgrReturnToClientRate(
  formId: string,
  data: MgrReturnToClientRateRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/to-client/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to set rate: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Client gives consent with letter (stage 3).
 * Guards: episode active, only client, consent_file_id required.
 */
export async function clientReturnConsent(
  formId: string,
  data: ClientReturnConsentRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/to-client/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to give consent: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Client refuses rate with reason (stage 3).
 * Guards: episode active, only client, reason required.
 */
export async function clientReturnRefuse(
  formId: string,
  data: ClientReturnRefuseRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/to-client/refuse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to refuse: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Manager executes RUB payment (stage 3).
 * CRITICAL: requires client consent letter.
 */
export async function mgrReturnToClientExecute(
  formId: string,
  data: MgrReturnToClientExecuteRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/to-client/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to execute payment: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Manager initiates repeat payment (stage 4).
 * Guards: episode active, only manager, comment required.
 */
export async function mgrReturnRepeat(
  formId: string,
  data: MgrReturnRepeatRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/repeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to initiate repeat: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Provider executes repeat payment (stage 4).
 * Guards: episode active, only assigned provider, payment_file_id required.
 */
export async function provReturnRepeatExecute(
  formId: string,
  data: ProvReturnRepeatExecuteRequest
): Promise<any> {
  const response = await fetch(`/api/v1/forms/${formId}/return/repeat/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to execute repeat: ${response.statusText}`);
  }
  return response.json();
}
