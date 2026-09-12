import type { AttachedDocument } from "./types";

export type UploadCandidate = { name: string; size: number };

const IMAGE_EXT = ["JPG", "JPEG", "PNG"];
const SHEET_EXT = ["XLSX", "XLS", "CSV"];
const TEXT_EXT = ["DOCX", "DOC"];
const BYTES_IN_KB = 1024;
const BYTES_IN_MB = 1024 * 1024;

/** Maps a file name to the extension badge used across registry and documents UI. */
export function documentExt(name: string): AttachedDocument["ext"] {
  const raw = name.split(".").pop()?.toUpperCase() ?? "";
  if (IMAGE_EXT.includes(raw)) return "JPG";
  if (SHEET_EXT.includes(raw)) return "XLSX";
  if (TEXT_EXT.includes(raw)) return "DOCX";
  return "PDF";
}

/** Human-readable size label in Russian units. */
export function documentSize(bytes: number): string {
  if (bytes >= BYTES_IN_MB) return `${(bytes / BYTES_IN_MB).toFixed(1)} МБ`;
  return `${Math.max(1, Math.round(bytes / BYTES_IN_KB))} КБ`;
}

const KIND_PATTERNS: [AttachedDocument["kind"], RegExp][] = [
  ["invoice", /инвойс|invoice|сч[её]т[-_\s]?фактур|^inv[-_.\s\d]/i],
  ["contract", /контракт|договор|contract|agreement|соглашени/i],
  ["payment", /плат[её]ж|поручени|payment|swift|mt103|выписк/i],
  ["report", /отч[её]т|report|акт[-_.\s]|спецификац/i],
  ["shipment", /отгрузк|shipment|накладн|коносамент|cmr|packing|упаковочн|гтд|декларац/i],
];

/** Guesses the document kind from the file name; falls back to "other". */
export function detectDocumentKind(name: string): AttachedDocument["kind"] {
  const base = name.replace(/\.[^.]+$/, "");
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(base)) return kind;
  }
  return "other";
}

/** Builds document rows for the demo contour (no backend, ids derived locally). */
export function buildAttachedDocuments({
  formId,
  files,
  kind,
  at,
  seed = Date.now(),
}: {
  formId: string;
  files: UploadCandidate[];
  kind?: AttachedDocument["kind"] | undefined;
  at: string;
  seed?: number;
}): AttachedDocument[] {
  return files.map((file, index) => ({
    id: `${formId}-doc-${seed}-${index}`,
    title: file.name.replace(/\.[^.]+$/, ""),
    ext: documentExt(file.name),
    size: documentSize(file.size),
    uploadedAt: at,
    kind: kind ?? detectDocumentKind(file.name),
  }));
}
