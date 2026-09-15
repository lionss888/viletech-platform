import type { PaymentForm } from "@/lib/ved/types";

const SHIPMENT_STATUSES = new Set([
  "shipment_waiting",
  "shipment_waiting_verification",
  "shipment_verification",
  "shipment_waiting_corrections",
]);

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  shipment_waiting: "Ожидает загрузки документов об отгрузке",
  shipment_waiting_verification: "Документы отгрузки ожидают проверки",
  shipment_verification: "Документы отгрузки в проверке",
  shipment_waiting_corrections: "Документы отгрузки требуют исправлений",
};

/**
 * Optional closing-docs branch. Happy path is report accept → completed.
 */
export function ShipmentPanel({ form }: { form: PaymentForm }) {
  if (!SHIPMENT_STATUSES.has(form.status)) return null;
  return (
    <div className="panel p-4" data-testid="shipment-panel">
      <p className="label-caps">Документы отгрузки</p>
      <p className="mt-2 text-sm">{SHIPMENT_STATUS_LABEL[form.status] ?? form.status}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Опциональный этап: заявку можно завершить после подтверждения отчёта без прохождения отгрузки. Не связан с курсом
        RATE_ON_PP.
      </p>
    </div>
  );
}
