import { createFileRoute } from "@tanstack/react-router";

import { ProviderOrganizationsPage } from "@/components/ved/pages/provider-organizations-page";

export const Route = createFileRoute("/demo/provider-organizations")({
  head: () => ({
    meta: [{ title: "Организации провайдеров — ⚡ Веди ВЭД ₽" }],
  }),
  component: ProviderOrganizationsPage,
});
