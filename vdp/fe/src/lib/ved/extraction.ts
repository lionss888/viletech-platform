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

/** Parses OCR/extraction JSON into typed fields for review UI. */
export function parseExtractionResult(invoiceJson: string | undefined | null): ExtractionResult | null {
  if (!invoiceJson || !invoiceJson.trim()) return null;
  try {
    const raw = JSON.parse(invoiceJson) as Record<string, unknown>;
    const candidate = (raw["extraction"] as Record<string, unknown> | undefined) ?? raw;
    if (candidate["schema_version"] !== "v1" && !candidate["header"] && !candidate["line_items"]) {
      return null;
    }
    const header = (candidate["header"] as ExtractionResult["header"]) ?? {};
    const lineItems = Array.isArray(candidate["line_items"])
      ? (candidate["line_items"] as ExtractionLineItem[])
      : [];
    const meta = (candidate["meta"] as ExtractionResult["meta"]) ?? {};
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
  if (input.hasDraft) return "review";
  const st = input.status ?? "";
  const editable = st === "creating" || st === "draft" || st.includes("correction");
  if (!editable) return "hide";
  // Upload + OCR controls stay on the card for these statuses (noDocuments is not a dead-end).
  if (st === "creating") return "pending";
  return "idle";
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
