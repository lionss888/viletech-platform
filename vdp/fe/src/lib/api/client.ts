import { ApiError, type ApiErrorBody } from "./errors";

export type ApiFetchOptions = RequestInit & {
  token?: string | null;
  skipRefresh?: boolean;
};

let refreshHandler: (() => Promise<string | null>) | null = null;

export function setTokenRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let code = "unknown";
  let message = response.statusText || "Request failed";
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.code) code = body.code;
    if (body.message) message = body.message;
  } catch {
    /* non-json body */
  }
  return new ApiError(response.status, code, message);
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Request-ID", newRequestId());
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && !options.skipRefresh && refreshHandler) {
    const next = await refreshHandler();
    if (next) {
      return apiFetch<T>(path, { ...options, token: next, skipRefresh: true });
    }
  }
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
