import { createFileRoute } from "@tanstack/react-router";

import { ProvidersPage } from "./demo/providers";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [{ title: "Платёжные агенты — ⚡ Веди ВЭД ₽" }],
  }),
  component: ProvidersPage,
});
