/** Manager must assign provider before starting payment execution. */
export function blocksPaymentStartWithoutProvider(
  status: string,
  actionId: string,
  providerId?: string,
): boolean {
  if (actionId !== "mgr_payment_start") return false;
  if (status !== "payment_received") return false;
  return !providerId;
}

/** Copy when payment start is blocked until provider is assigned. */
export const PAYMENT_START_PROVIDER_LOCK =
  "Назначьте провайдера исполнения — без этого платёж провайдеру не передать.";

/** Assigned provider stays; the assign action leaves the card and the queue. */
export function withoutAssignedProviderAction<T extends { id: string }>(
  actions: T[],
  providerId?: string,
): T[] {
  if (!providerId) return actions;
  return actions.filter((action) => action.id !== "mgr_assign_provider");
}

/** Option label. Omits an empty country so the row is not «Name · —». */
export function partyOptionLabel(name: string, country?: string): string {
  const trimmed = country?.trim() ?? "";
  if (!trimmed || trimmed === "—") return name;
  return `${name} · ${trimmed}`;
}

type ImportAdvanceGateInput = {
  status: string;
  actionId: string;
  condition?: string;
  direction?: string;
  paymentMethod?: string;
};

/** Import advance (or empty method MVP): RUB coverage confirmed by treasurer, not manager/provider start. */
export function isImportAdvanceCoverageGate(input: {
  condition?: string;
  direction?: string;
  paymentMethod?: string;
}): boolean {
  const direction = (input.direction ?? "import").toLowerCase();
  if (direction === "export") return false;
  const method = (input.paymentMethod ?? "").trim();
  if (method === "post_payment" || method === "PAY_FROM_EXPORT") return false;
  if (input.condition === "postPayment") return false;
  // advance | empty MVP (IMP1)
  return true;
}

/** Hide manager/provider payment_start on payment_received for import advance (§10.2 treasurer). */
export function hidesPaymentStartForImportAdvance(input: ImportAdvanceGateInput): boolean {
  if (input.status !== "payment_received") return false;
  if (input.actionId !== "mgr_payment_start" && input.actionId !== "prov_payment_start" && input.actionId !== "payment_start") {
    return false;
  }
  return isImportAdvanceCoverageGate(input);
}

/**
 * Treasurer confirm on payment_processing is export-only (→ payment_sent_treasurer).
 * Import advance already confirmed on payment_received; re-showing the CTA would 409.
 */
export function hidesTreasurerConfirmOnProcessingForImport(input: ImportAdvanceGateInput): boolean {
  if (input.actionId !== "treas_confirm_payment") return false;
  if (input.status !== "payment_processing") return false;
  const direction = (input.direction ?? "import").toLowerCase();
  if (direction === "export") return false;
  if ((input.paymentMethod ?? "").trim() === "PAY_FROM_EXPORT") return false;
  return true;
}

/** Guided note when manager waits for treasurer on import advance. */
export const IMPORT_ADVANCE_AWAITS_TREASURER =
  "Рублёвое покрытие подтверждает казначей — после этого заявка перейдёт в исполнение.";

/** Import postpay with rate fixed on payment proof day (§10.3). */
export function isPostpayRateOnPP(input: {
  platformPostpayMode?: string;
  rateOnProvider?: boolean;
  paymentMethod?: string;
  condition?: string;
}): boolean {
  if (input.platformPostpayMode === "POSTPAY_RATE_ON_PP") return true;
  if (input.rateOnProvider === true) return true;
  return false;
}

/** True when rate.value is missing, blank, or placeholder zero (seed default). */
export function isRateEmpty(rate?: { value?: string }): boolean {
  const value = rate?.value?.trim() ?? "";
  if (!value) return true;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber === 0;
}

/**
 * Block mgr_advance_signing on payment_sent for RATE_ON_PP until rate is set.
 */
export function blocksAdvanceSigningWithoutRate(input: {
  status: string;
  actionId: string;
  platformPostpayMode?: string;
  rateOnProvider?: boolean;
  rate?: { value?: string };
}): boolean {
  if (input.actionId !== "mgr_advance_signing") return false;
  if (input.status !== "payment_sent") return false;
  if (
    !isPostpayRateOnPP({
      platformPostpayMode: input.platformPostpayMode,
      rateOnProvider: input.rateOnProvider,
    })
  ) {
    return false;
  }
  return isRateEmpty(input.rate);
}

/** Guided copy when advance signing waits for rate + commission. */
export const ADVANCE_SIGNING_NEEDS_RATE =
  "Укажите курс и комиссию — без этого доп. поручение сформировать нельзя.";

const ADVANCE_RATE_STATUSES = new Set([
  "form_accepted",
  "contract_waiting",
  "contract_verification",
]);

/**
 * Import advance surface (§3.1): manager/root on pre-signing_order statuses, not POSTPAY_RATE_ON_PP.
 */
export function isAdvanceRateSurface(input: {
  status: string;
  role: string;
  condition?: string;
  direction?: string;
  paymentMethod?: string;
  platformPostpayMode?: string;
  rateOnProvider?: boolean;
}): boolean {
  if (input.role !== "manager" && input.role !== "root") return false;
  if (!ADVANCE_RATE_STATUSES.has(input.status)) return false;
  if (
    isPostpayRateOnPP({
      platformPostpayMode: input.platformPostpayMode,
      rateOnProvider: input.rateOnProvider,
      paymentMethod: input.paymentMethod,
      condition: input.condition,
    })
  ) {
    return false;
  }
  return isImportAdvanceCoverageGate({
    condition: input.condition,
    direction: input.direction,
    paymentMethod: input.paymentMethod,
  });
}

/**
 * Import advance §3.1: show editable rate/commission panel while rate is still empty.
 * Mutually exclusive with RateCommissionPanel on payment_sent (POSTPAY_RATE_ON_PP).
 */
export function canSelectAdvanceRate(input: {
  status: string;
  role: string;
  rate?: { value?: string };
  condition?: string;
  direction?: string;
  paymentMethod?: string;
  platformPostpayMode?: string;
  rateOnProvider?: boolean;
}): boolean {
  return isAdvanceRateSurface(input) && isRateEmpty(input.rate);
}

/** Export form_accepted only allows advance_signing; import keeps agent/contract CTAs. */
export function hidesFormAcceptedActionForDirection(input: {
  status: string;
  actionId: string;
  direction?: string;
}): boolean {
  if (input.status !== "form_accepted") return false;
  const isExport = (input.direction ?? "import").toLowerCase() === "export";
  if (isExport) {
    return input.actionId !== "mgr_advance_signing";
  }
  return input.actionId === "mgr_advance_signing";
}
