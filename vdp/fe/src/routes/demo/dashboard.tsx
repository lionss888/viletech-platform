import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/routes/dashboard";

export const Route = createFileRoute("/demo/dashboard")({
  component: DashboardPage,
});
