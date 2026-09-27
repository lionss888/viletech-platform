/** ExtractionResult schema v1 (mirrors vdp/shared/extraction). */
export type ExtractionLineItem = {
  line_no?: number;
  description?: string;
  qty?: string;
  unit?: string;
  unit_price?: string;
  line_amount?: string;
  currency?: string;
  hs_code?: string;
  confidence?: number;
};

export type ExtractionResult = {
  schema_version: string;
  doc_type?: string;
  language?: string;
  confidence?: number;
  header: {
    contract_number?: string;
    contract_date?: string;
    invoice_number?: string;
    invoice_date?: string;
    invoice_amount?: string;
    currency?: string;
    company_name?: string;
    hs_codes?: string[];
  };
  line_items: ExtractionLineItem[];
  meta: {
    engine_id?: string;
    model_version?: string;
    confirmed?: boolean;
    form_payment_id?: string;
  };
  warnings?: string[];
};

/** Wizard / card poll: wait this long for ExtractionResult before honest fail. */
/** Wizard OCR poll budget (ms). Above hub OCR_TIMEOUT_MS (180s) so degraded callback can land. */
export const OCR_POLL_TIMEOUT_MS = 225_000;

/** Wizard OCR banner states (honest UX). */
export type OcrBannerState =
  | "unavailable"
  | "pending"
  | "done"
  | "degraded"
  | "failed"
  | "auth_lost";

const DEGRADED_ENGINES = new Set(["unavailable", "timeout", "fixture_error", "fixture"]);

/** True when ExtractionResult must not show as successful OCR done. */
export function isDegradedExtraction(result: ExtractionResult): boolean {
  const id = (result.meta.engine_id ?? "").trim();
  if (DEGRADED_ENGINES.has(id) || id.endsWith("_fallback")) return true;
  const warnings = result.warnings ?? [];
  return (
    warnings.includes("degraded") ||
    warnings.includes("fixture_mode") ||
    warnings.includes("primary_error") ||
    warnings.includes("primary_fallback")
  );
}

/** True when extraction carries at least one field the wizard can prefill. */
export function hasPrefillableExtraction(result: ExtractionResult): boolean {
  const header = result.header ?? {};
  if (header.invoice_amount?.trim()) return true;
  if (header.currency?.trim()) return true;
  if (header.invoice_number?.trim()) return true;
  if (header.contract_number?.trim()) return true;
  if (header.hs_codes?.some((code) => Boolean(code?.trim()))) return true;
  return result.line_items.some(
    (line) => Boolean(line.line_amount?.trim()) || Boolean(line.currency?.trim()),
  );
}

/**
 * Map draft to done vs degraded after poll sees ExtractionResult.
 * Done only when primary path has usable fields and confidence is not low — never promise autofill on empty/limitations.
 */
export function ocrBannerFromExtraction(result: ExtractionResult): "done" | "degraded" {
  if (isDegradedExtraction(result)) return "degraded";
  if (!hasPrefillableExtraction(result)) return "degraded";
  if (isLowConfidence(result)) return "degraded";
  return "done";
}

/** True when poll should stop permanently (not pending). */
export function isOcrBannerTerminal(state: OcrBannerState | null | undefined): boolean {
  return Boolean(state && state !== "pending");
}

/** Detect auth death from ApiError-like objects. */
export function isOcrAuthLostError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  return status === 401;
}

/** Parses OCR/extraction JSON into typed fields for review UI. */
export function parseExtractionResult(invoiceJson: string | undefined | null): ExtractionResult | null {
  if (!invoiceJson || !invoiceJson.trim()) return null;
  try {
    const raw = JSON.parse(invoiceJson) as Record<string, unknown>;
    const candidate = (raw["extraction"] as Record<string, unknown> | undefined) ?? raw;
    const meta = (candidate["meta"] as ExtractionResult["meta"]) ?? {};
    const engineId = typeof meta.engine_id === "string" ? meta.engine_id.trim() : "";
    const hasSchema = candidate["schema_version"] === "v1";
    // Reject form dumps and other JSON that only share sparse keys with extraction.
    if (!hasSchema && !engineId) {
      return null;
    }
    const header = (candidate["header"] as ExtractionResult["header"]) ?? {};
    const lineItems = Array.isArray(candidate["line_items"])
      ? (candidate["line_items"] as ExtractionLineItem[])
      : [];
    return {
      schema_version: "v1",
      doc_type: typeof candidate["doc_type"] === "string" ? candidate["doc_type"] : undefined,
      language: typeof candidate["language"] === "string" ? candidate["language"] : undefined,
      confidence: typeof candidate["confidence"] === "number" ? candidate["confidence"] : undefined,
      header,
      line_items: lineItems,
      meta,
      warnings: Array.isArray(candidate["warnings"]) ? (candidate["warnings"] as string[]) : undefined,
    };
  } catch {
    return null;
  }
}

/** True when invoice_json holds ExtractionResult schema v1 (not a form dump). */
export function isExtractionDraft(invoiceJson: string | undefined | null): boolean {
  return parseExtractionResult(invoiceJson) !== null;
}

/** True when OCR poll should stop and show the fail banner. */
export function ocrPollTimedOut(elapsedMs: number, timeoutMs: number = OCR_POLL_TIMEOUT_MS): boolean {
  return elapsedMs >= timeoutMs;
}

/** Terminal statuses where OCR controls are no longer useful. */
export function isExtractionPanelTerminal(status: string): boolean {
  const st = status.trim();
  if (!st) return false;
  if (st === "finished" || st === "closed") return true;
  if (st.includes("cancel")) return true;
  return false;
}

/** True when extraction confidence is below review threshold. */
export function isLowConfidence(item: ExtractionLineItem | ExtractionResult): boolean {
  const c = "confidence" in item ? item.confidence : undefined;
  return typeof c === "number" && c < 0.55;
}

/** When to show the OCR panel shell on the form card. */
export function extractionPanelMode(input: {
  role: string;
  hasDraft: boolean;
  status?: string;
  noDocuments?: boolean;
  hasDocuments?: boolean;
}): "hide" | "pending" | "review" | "idle" {
  if (input.role === "provider") return "hide";
  if (input.noDocuments) return "hide";
  if (input.hasDraft) return "review";
  const st = input.status ?? "";
  if (isExtractionPanelTerminal(st)) return "hide";
  if (st === "creating") return "pending";
  if (input.hasDocuments) return "idle";
  const editable = st === "draft" || st.includes("correction");
  if (editable) return "idle";
  return "hide";
}

/** Pull raw OCR layout blob out of warnings (prefix layout:). */
export function layoutTextFromWarnings(warnings: string[] | undefined): string {
  if (!warnings?.length) return "";
  return warnings
    .filter((w) => w.startsWith("layout:"))
    .map((w) => w.slice("layout:".length))
    .join("\n")
    .trim();
}

/** Warnings suitable for a short amber list (excludes layout dump). */
export function shortExtractionWarnings(warnings: string[] | undefined): string[] {
  if (!warnings?.length) return [];
  return warnings.filter((w) => !w.startsWith("layout:"));
}

function asNumber(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(value) ? undefined : value;
}

/** Visible before confirm when header and lines do not agree. Does not pick a second total. */
export function extractionAmountWarnings(result: ExtractionResult): string[] {
  const warnings: string[] = [];
  const header = asNumber(result.header.invoice_amount);
  let lineSum = 0;
  let hasLineAmount = false;
  result.line_items.forEach((line, index) => {
    const qty = asNumber(line.qty);
    const price = asNumber(line.unit_price);
    const amount = asNumber(line.line_amount);
    if (qty !== undefined && price !== undefined && amount !== undefined && Math.abs(qty * price - amount) > 0.01) {
      warnings.push(`Строка ${index + 1}: количество × цена не равно сумме строки.`);
    }
    if (amount !== undefined) {
      lineSum += amount;
      hasLineAmount = true;
    }
  });
  if (header !== undefined && hasLineAmount && Math.abs(header - lineSum) > 0.01) {
    warnings.push("Сумма в шапке не равна сумме строк. В заявку попадёт сумма шапки — сверьте её до подтверждения.");
  }
  return warnings;
}

/** Warnings when confirming OCR on a signed order document (amount vs form). */
export function orderExtractionWarnings(
  result: ExtractionResult,
  formAmountMinor?: number,
  formCurrency?: string,
): string[] {
  const warnings = extractionAmountWarnings(result);
  const headerAmount = asNumber(result.header.invoice_amount);
  if (headerAmount !== undefined && formAmountMinor !== undefined && formAmountMinor > 0) {
    const formMajor = formAmountMinor / 100;
    if (Math.abs(headerAmount - formMajor) > 0.01) {
      warnings.push(
        `Сумма в распознанном документе (${headerAmount}) не совпадает с заявкой (${formMajor}).`,
      );
    }
  }
  const headerCurrency = result.header.currency?.trim().toUpperCase();
  const expected = formCurrency?.trim().toUpperCase();
  if (headerCurrency && expected && headerCurrency !== expected) {
    warnings.push(`Валюта в документе (${headerCurrency}) отличается от валюты заявки (${expected}).`);
  }
  return warnings;
}

export function canControlExtraction(role: string, status?: string): boolean {
  if (role !== "user" && role !== "manager" && role !== "root") return false;
  const st = status ?? "";
  return st === "creating" || st === "draft" || st.includes("correction");
}

export type ExtractionPanelMode = ReturnType<typeof extractionPanelMode>;

/** CTA label next to document upload for opening the extraction dialog. */
export function extractionTriggerLabel(mode: ExtractionPanelMode): string {
  if (mode === "pending") return "Распознавание…";
  if (mode === "review") return "Просмотр данных";
  if (mode === "idle") return "Статус распознавания";
  return "";
}

/** Dialog / sheet title for the extraction review surface. */
export function extractionDialogTitle(mode: ExtractionPanelMode): string {
  if (mode === "review") return "Распознанные данные";
  return "Распознавание";
}

/** Desktop modal vs mobile bottom sheet. */
export function extractionShellVariant(isMobile: boolean): "modal" | "sheet" {
  return isMobile ? "sheet" : "modal";
}
