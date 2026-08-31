import { loadAuthTokens, newRequestId } from "./client";

export type UploadedFileMeta = {
  id: string;
  storage_key?: string;
  mime?: string;
  original_name?: string;
};

/** 15 MB — matches core upload limit (B.2). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export function formatUploadError(status: number, fallback?: string): string {
  if (status === 413) return "Файл слишком большой (максимум 15 МБ)";
  if (status === 415) return "Недопустимый тип файла — загрузите PDF";
  return fallback ?? "Не удалось загрузить файл";
}

export function assertFileSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(413, formatUploadError(413));
  }
}

function apiBase(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

/** Multipart upload to file-store; returns file id for docs/attach. */
export async function uploadFile(formId: string, file: File): Promise<UploadedFileMeta> {
  assertFileSize(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("form_id", formId);
  const headers = new Headers();
  headers.set("X-Request-ID", newRequestId());
  const tokens = loadAuthTokens();
  if (tokens?.token) headers.set("Authorization", `Bearer ${tokens.token}`);
  const response = await fetch(`${apiBase()}/api/v1/file-store/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    throw new UploadError(response.status, formatUploadError(response.status, response.statusText || "Upload failed"));
  }
  return (await response.json()) as UploadedFileMeta;
}

export function attachDocToForm(
  formId: string,
  fileId: string,
  kind: string,
  label?: string,
): Promise<Record<string, unknown>> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", newRequestId());
  const tokens = loadAuthTokens();
  if (tokens?.token) headers.set("Authorization", `Bearer ${tokens.token}`);
  return fetch(`${apiBase()}/api/v1/forms/${formId}/docs/attach`, {
    method: "POST",
    headers,
    body: JSON.stringify({ file_id: fileId, kind, label: label ?? kind }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(response.statusText || "Attach failed");
    return (await response.json()) as Record<string, unknown>;
  });
}
