import { apiFetch } from "./client";
import type { AccountProfile, AuthSession } from "./types";

export async function loginApi(email: string, password: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipRefresh: true,
  });
}

export async function refreshApi(refreshToken: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipRefresh: true,
  });
}

export async function logoutApi(token: string): Promise<void> {
  await apiFetch<void>("/api/v1/auth/logout", {
    method: "POST",
    token,
    skipRefresh: true,
  });
}

export async function getAccountApi(token: string): Promise<AccountProfile> {
  return apiFetch<AccountProfile>("/api/v1/account", { token });
}
