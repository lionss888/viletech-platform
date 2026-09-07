import { apiFetch, loadAuthTokens, newRequestId } from "./client";

export type DocGenerateKind = "agency_contract" | "principal_order" | "agent_report" | "payment_order";

export function generateFormDoc(formId: string, kind: DocGenerateKind): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/api/v1/forms/${formId}/docs/generate`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

function apiBase(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

/** Authenticated preview URL for file-store download (opens in new tab with Bearer via fetch). */
export function previewPrivatePath(fileId: string): string {
  return `${apiBase()}/api/v1/file-store/preview/private/${fileId}`;
}

/** Fetches private file with Bearer auth and returns a blob (+ object URL). Caller must revoke the URL. */
export async function fetchPrivateFileBlob(fileId: string): Promise<{ blob: Blob; objectUrl: string }> {
  const headers = new Headers();
  headers.set("X-Request-ID", newRequestId());
  const tokens = loadAuthTokens();
  if (tokens?.token) headers.set("Authorization", `Bearer ${tokens.token}`);
  const response = await fetch(previewPrivatePath(fileId), { headers });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "Файл не найден" : "Не удалось открыть документ");
  }
  const blob = await response.blob();
  return { blob, objectUrl: URL.createObjectURL(blob) };
}

export async function downloadPrivateFile(fileId: string, fileName: string): Promise<void> {
  const { blob, objectUrl } = await fetchPrivateFileBlob(fileId);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
  void blob;
}
