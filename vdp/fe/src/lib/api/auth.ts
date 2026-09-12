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

/** POST /api/v1/auth/login (skipAuth); stores tokens on success. */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const session = await apiFetch<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
  saveAuthTokens(session);
  return session;
}

/** POST logout then always clear local tokens. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
  } finally {
    clearAuthTokens();
  }
}

/** GET current account profile for the JWT principal. */
export async function getAccount(): Promise<AccountView> {
  return apiFetch<AccountView>("/api/v1/account");
}
