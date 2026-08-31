import { createFileRoute } from "@tanstack/react-router";

import { CurrenciesPage } from "./demo/currencies";

export const Route = createFileRoute("/currencies")({
  head: () => ({
    meta: [{ title: "Валюты — ВЭД от Вилетех" }],
  }),
  component: CurrenciesPage,
});
