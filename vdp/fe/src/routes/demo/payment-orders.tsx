import { createFileRoute } from "@tanstack/react-router";

import { PaymentOrdersPage } from "@/components/ved/pages/payment-orders-page";

export const Route = createFileRoute("/demo/payment-orders")({
  head: () => ({
    meta: [{ title: "Платёжные поручения — ⚡ Веди ВЭД ₽" }],
  }),
  component: PaymentOrdersPage,
});
