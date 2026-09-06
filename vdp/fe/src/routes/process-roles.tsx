import { createFileRoute } from "@tanstack/react-router";

import { ProcessRolesPage } from "@/components/ved/pages/process-roles-page";

export const Route = createFileRoute("/process-roles")({
  head: () => ({
    meta: [{ title: "Роли процесса — ВЭД от Вилетех" }],
  }),
  component: ProcessRolesPage,
});
