import { createFileRoute } from "@tanstack/react-router";

import { CounterpartiesPage } from "./demo/counterparties";

export const Route = createFileRoute("/counterparties")({
  head: () => ({
    meta: [{ title: "Контрагенты — ⚡ Веди ВЭД ₽" }],
  }),
  component: CounterpartiesPage,
});
