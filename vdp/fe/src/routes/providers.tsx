import { createFileRoute } from "@tanstack/react-router";

import { ProvidersPage } from "./demo/providers";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [{ title: "Провайдеры — ВЭД от Вилетех" }],
  }),
  component: ProvidersPage,
});
