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

/** True when rate.value is missing or blank. */
export function isRateEmpty(rate?: { value?: string }): boolean {
  return !rate?.value?.trim();
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
