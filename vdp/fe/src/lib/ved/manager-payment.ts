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

export const PAYMENT_START_PROVIDER_LOCK =
  "Назначьте провайдера исполнения — без этого платёж провайдеру не передать.";
