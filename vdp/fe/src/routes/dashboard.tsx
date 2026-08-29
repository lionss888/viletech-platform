import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/components/ved/pages/dashboard-page";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Рабочий стол — ВЭД от Вилетех" }],
  }),
  component: DashboardPage,
});
