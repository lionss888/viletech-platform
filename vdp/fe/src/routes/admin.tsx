import { createFileRoute } from "@tanstack/react-router";

import { pageTitle } from "@/lib/brand";

import { AdminPage } from "./demo/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: pageTitle("Пользователи") }],
  }),
  component: AdminPage,
});
