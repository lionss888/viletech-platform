import { apiFetch, clearAuthTokens, saveAuthTokens, type AuthTokens } from "./client";

export type AccountView = {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  organization_id?: string;
  telegram_linked?: boolean;
  telegram_notify_enabled?: boolean;
  sms_notify_enabled?: boolean;
};

export async function login(email: string, password: string): Promise<AuthTokens> {
  const session = await apiFetch<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
  saveAuthTokens(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
  } finally {
    clearAuthTokens();
  }
}

export async function getAccount(): Promise<AccountView> {
  return apiFetch<AccountView>("/api/v1/account");
}
