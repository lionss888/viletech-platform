import { createFileRoute } from "@tanstack/react-router";

import { OrganizationsPage } from "./demo/organizations";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [{ title: "Организации — ВЭД от Вилетех" }],
  }),
  component: OrganizationsPage,
});
