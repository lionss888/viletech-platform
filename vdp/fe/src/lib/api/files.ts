import { loadAuthTokens, newRequestId } from "./client";

export type UploadedFileMeta = {
  id: string;
  storage_key?: string;
  mime?: string;
  original_name?: string;
};

function apiBase(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

/** Multipart upload to file-store; returns file id for docs/attach. */
export async function uploadFile(formId: string, file: File): Promise<UploadedFileMeta> {
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
    const message = response.statusText || "Upload failed";
    throw new Error(message);
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
