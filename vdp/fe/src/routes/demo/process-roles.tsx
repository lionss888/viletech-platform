import { createFileRoute } from "@tanstack/react-router";

import { ProcessRolesPage } from "@/components/ved/pages/process-roles-page";

export const Route = createFileRoute("/demo/process-roles")({
  head: () => ({
    meta: [{ title: "Роли процесса (демо) — ВЭД от Вилетех" }],
  }),
  component: ProcessRolesPage,
});
