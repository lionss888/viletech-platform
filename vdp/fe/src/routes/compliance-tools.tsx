import { createFileRoute } from "@tanstack/react-router";

import { ComplianceToolsPage } from "./demo/compliance-tools";

export const Route = createFileRoute("/compliance-tools")({
  head: () => ({
    meta: [{ title: "Инструменты комплаенс — ⚡ Веди ВЭД ₽" }],
  }),
  component: ComplianceToolsPage,
});
