import { createFileRoute } from "@tanstack/react-router";

import { CurrenciesPage } from "./demo/currencies";

export const Route = createFileRoute("/currencies")({
  head: () => ({
    meta: [{ title: "Валюты — ⚡ Веди ВЭД ₽" }],
  }),
  component: CurrenciesPage,
});
