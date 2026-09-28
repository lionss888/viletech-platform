import { loadAuthTokens, newRequestId, refreshTokens } from "./client";

export type UploadedFileMeta = {
  id: string;
  storage_key?: string;
  mime?: string;
  original_name?: string;
};

/** 15 MB — matches core upload limit (B.2). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Upload failure with HTTP status for cabinet copy. */
export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/** User-facing upload error text from status code. */
export function formatUploadError(status: number, fallback?: string): string {
  if (status === 401) return "Сессия истекла — войдите снова";
  if (status === 403) return "Недостаточно прав для загрузки файла";
  if (status === 413) return "Файл слишком большой (максимум 15 МБ)";
  if (status === 415) return "Недопустимый тип файла — загрузите PDF";
  return fallback ?? "Не удалось загрузить файл";
}

/** Throws UploadError when file exceeds platform size limit. */
export function assertFileSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(413, formatUploadError(413));
  }
}

function apiBase(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

/**
 * Authenticated fetch for multipart/raw bodies; refreshes once on 401
 * (same contract as apiFetch JSON path).
 */
async function authFetch(path: string, init: RequestInit, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Request-ID", headers.get("X-Request-ID") ?? newRequestId());
  const tokens = loadAuthTokens();
  if (tokens?.token) headers.set("Authorization", `Bearer ${tokens.token}`);
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  if (response.status === 401 && !retried) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return authFetch(path, init, true);
    }
  }
  return response;
}

/** Multipart upload to file-store; returns file id for docs/attach. */
export async function uploadFile(formId: string, file: File): Promise<UploadedFileMeta> {
  assertFileSize(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("form_id", formId);
  const response = await authFetch("/api/v1/file-store/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new UploadError(response.status, formatUploadError(response.status, response.statusText || "Upload failed"));
  }
  return (await response.json()) as UploadedFileMeta;
}

/** Links an uploaded file_id to the form DocsJSON via nest prefix. */
export async function attachDocToForm(
  formId: string,
  fileId: string,
  kind: string,
  label?: string,
): Promise<Record<string, unknown>> {
  const response = await authFetch(`/api/v1/forms/${formId}/docs/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, kind, label: label ?? kind }),
  });
  if (!response.ok) {
    throw new UploadError(response.status, formatUploadError(response.status, response.statusText || "Attach failed"));
  }
  return (await response.json()) as Record<string, unknown>;
}

/** Nest DELETE …/files/{fileId} — removes file ref from form docs_json. */
export async function detachDocFromForm(formId: string, fileId: string, nestPrefix: string): Promise<unknown> {
  const response = await authFetch(
    `/api/v1/${nestPrefix}/form-payment/${formId}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new UploadError(response.status, formatUploadError(response.status, response.statusText || "Delete failed"));
  }
  if (response.status === 204) return {};
  return (await response.json()) as unknown;
}
