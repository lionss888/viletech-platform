import { createFileRoute } from "@tanstack/react-router";

import { ProvidersPage } from "./demo/providers";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [{ title: "Провайдеры — ⚡ Веди ВЭД ₽" }],
  }),
  component: ProvidersPage,
});
