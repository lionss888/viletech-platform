import { createFileRoute } from "@tanstack/react-router";

import { AgentOrganizationPage } from "@/components/ved/pages/agent-organization-page";

export const Route = createFileRoute("/demo/agent-organization")({
  head: () => ({
    meta: [{ title: "Корневая организация — ⚡ Веди ВЭД ₽" }],
  }),
  component: AgentOrganizationPage,
});
