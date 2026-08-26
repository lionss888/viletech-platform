export type ApiErrorBody = {
  code?: string;
  message?: string;
  error?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type AuthTokens = {
  token: string;
  refresh_token: string;
  account_id: string;
  role: string;
  account?: Record<string, unknown>;
};

const STORAGE_KEY = "vdp-auth-v1";

export function loadAuthTokens(): AuthTokens | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function saveAuthTokens(tokens: AuthTokens): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearAuthTokens(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

function apiBase(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

function newRequestId(): string {
  return `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
  retry?: boolean;
};

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const current = loadAuthTokens();
    if (!current?.refresh_token) return null;
    try {
      const res = await fetch(`${apiBase()}/api/v1/auth/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": newRequestId(),
        },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      if (!res.ok) {
        clearAuthTokens();
        return null;
      }
      const next = (await res.json()) as AuthTokens;
      saveAuthTokens(next);
      return next;
    } catch {
      clearAuthTokens();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-ID", headers.get("X-Request-ID") ?? newRequestId());
  if (!options.skipAuth) {
    const tokens = loadAuthTokens();
    if (tokens?.token) headers.set("Authorization", `Bearer ${tokens.token}`);
  }
  const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
  if (response.status === 401 && !options.skipAuth && options.retry !== false) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retry: false });
    }
  }
  if (!response.ok) {
    let code = "http_error";
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as ApiErrorBody;
      code = body.code ?? code;
      message = body.message ?? body.error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(response.status, code, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
