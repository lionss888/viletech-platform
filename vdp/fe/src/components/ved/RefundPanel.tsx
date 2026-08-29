import { useQuery } from "@tanstack/react-query";

import { getRefund } from "@/lib/api/refund";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import type { PaymentForm } from "@/lib/ved/types";

const REFUND_STATUSES = new Set([
  "payment_refund_waiting",
  "payment_refund_processing",
  "payment_refund_sent",
]);

const REFUND_STATUS_LABEL: Record<string, string> = {
  payment_refund_waiting: "Ожидает запуска",
  payment_refund_processing: "В процессе",
  payment_refund_sent: "Средства возвращены",
};

export function RefundPanel({ form }: { form: PaymentForm }) {
  const mode = usePlatformMode();
  const enabled = mode === "app" && REFUND_STATUSES.has(form.status);
  const refundQuery = useQuery({
    queryKey: ["refund", form.id],
    queryFn: () => getRefund(form.id),
    enabled,
  });

  if (!REFUND_STATUSES.has(form.status)) return null;

  const refund = refundQuery.data;
  const refundAmount = refund?.refund_amount ?? refund?.amount;
  const refundCurrency = refund?.refund_currency ?? refund?.currency ?? form.currency;

  return (
    <div className="panel p-4">
      <p className="label-caps">Процесс возврата средств</p>
      {mode === "demo" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Статус заявки: {form.status}. Действия возврата — в панели «Доступные действия».
        </p>
      )}
      {mode === "app" && refundQuery.isLoading && <p className="mt-2 text-xs text-muted-foreground">Загрузка…</p>}
      {refund && (
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="label-caps">Статус возврата</dt>
            <dd>{REFUND_STATUS_LABEL[refund.status] ?? refund.status}</dd>
          </div>
          {refundAmount && (
            <div>
              <dt className="label-caps">Сумма возврата</dt>
              <dd className="font-mono">
                {refundAmount} {refundCurrency}
              </dd>
            </div>
          )}
          {refund.received_amount && (
            <div>
              <dt className="label-caps">Получено от клиента</dt>
              <dd className="font-mono">
                {refund.received_amount} {refund.received_currency ?? form.currency}
              </dd>
            </div>
          )}
          {refund.comment && (
            <div>
              <dt className="label-caps">Комментарий</dt>
              <dd>{refund.comment}</dd>
            </div>
          )}
        </dl>
      )}
      {refund?.unrefunded_blocks_cancel && (
        <p className="mt-2 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">
          Отмена заявки заблокирована: средства ещё не возвращены клиенту. Завершите возврат или отмените процесс
          возврата.
        </p>
      )}
      {!refund?.unrefunded_blocks_cancel && refund && (
        <p className="mt-2 text-xs text-muted-foreground">После возврата средств заявку можно отменить или закрыть.</p>
      )}
    </div>
  );
}
