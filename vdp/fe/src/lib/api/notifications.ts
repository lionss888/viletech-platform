import { apiFetch } from "./client";

export type TelegramLinkResult = {
  code: string;
  deep_link: string;
  expires_at: string;
};

export type WorkChatView = {
  id: string;
  title: string;
  kind: string;
  active: boolean;
  join_status: "none" | "pending" | "approved" | "rejected";
};

export type ChatJoin = {
  id: string;
  chat_id: string;
  account_id: string;
  status: "none" | "pending" | "approved" | "rejected";
};

export type DiadocStatusView = {
  status: "idle" | "queued" | "signed" | "failed" | string;
  kind?: string;
  manual_path: boolean;
};

export function linkTelegram(): Promise<TelegramLinkResult> {
  return apiFetch<TelegramLinkResult>("/api/v1/me/telegram/link", { method: "POST" });
}

export function unlinkTelegram(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/v1/me/telegram/unlink", { method: "POST" });
}

export function patchNotifyPrefs(input: {
  telegram_notify_enabled?: boolean;
  sms_notify_enabled?: boolean;
}): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/v1/me/notifications", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listWorkChats(): Promise<WorkChatView[]> {
  return apiFetch<WorkChatView[]>("/api/v1/work-chats");
}

export function requestWorkChatJoin(chatId: string): Promise<ChatJoin> {
  return apiFetch<ChatJoin>(`/api/v1/work-chats/${chatId}/join`, { method: "POST" });
}

export function listPendingJoins(): Promise<ChatJoin[]> {
  return apiFetch<ChatJoin[]>("/api/v1/admin/work-chats/joins");
}

export function approveJoin(id: string): Promise<ChatJoin> {
  return apiFetch<ChatJoin>(`/api/v1/admin/work-chats/joins/${id}/approve`, { method: "POST" });
}

export function rejectJoin(id: string): Promise<ChatJoin> {
  return apiFetch<ChatJoin>(`/api/v1/admin/work-chats/joins/${id}/reject`, { method: "POST" });
}

export function getFormDiadocStatus(formId: string): Promise<DiadocStatusView> {
  return apiFetch<DiadocStatusView>(`/api/v1/forms/${formId}/diadoc-status`);
}
