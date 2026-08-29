import type { CoreForm } from "./forms";
import { apiFetch } from "./client";

export function assignAgent(formId: string, agentId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/agent`, {
    method: "POST",
    body: JSON.stringify({ agent_id: agentId }),
  });
}

export function assignDeadline(formId: string, deadlineIso: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/deadline`, {
    method: "POST",
    body: JSON.stringify({ deadline: deadlineIso }),
  });
}

export function setConfirmation(formId: string, input: { content?: string; file_id?: string }): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/confirmation`, {
    method: "POST",
    body: JSON.stringify({ content: input.content ?? "", file_id: input.file_id ?? "" }),
  });
}
