import { apiFetch } from "./client";

export type OcrReadiness = {
  ok: boolean;
  extraction: string;
  docling_reachable?: boolean | null;
  reason?: string;
  primary?: string;
};

/** Cabinet OCR availability (extraction + optional docling probe). */
export function fetchOcrReadiness(): Promise<OcrReadiness> {
  return apiFetch<OcrReadiness>("/api/v1/ocr/readiness");
}
