import { createFileRoute } from "@tanstack/react-router";

import { AgentReportsPage } from "@/components/ved/pages/agent-reports-page";

export const Route = createFileRoute("/agent-reports")({
  head: () => ({
    meta: [{ title: "Отчёты — ⚡ Веди ВЭД ₽" }],
  }),
  component: AgentReportsPage,
});
