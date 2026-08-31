import { apiFetch } from "./client";
import type { FileUploadResponse } from "./types";

export async function uploadFileApi(token: string, file: File): Promise<FileUploadResponse> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<FileUploadResponse>("/api/v1/file-store/upload", {
    method: "POST",
    token,
    body,
  });
}

export function filePreviewUrl(fileId: string): string {
  return `/api/v1/file-store/preview/private/${encodeURIComponent(fileId)}`;
}

export async function attachDocApi(
  token: string,
  formId: string,
  fileId: string,
  docType: string,
): Promise<void> {
  await apiFetch(`/api/v1/docs/attach`, {
    method: "POST",
    token,
    body: JSON.stringify({
      form_payment_id: formId,
      file_id: fileId,
      type: docType,
    }),
  });
}
