import { createFileRoute } from "@tanstack/react-router";

import { AdminPage } from "./demo/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Пользователи — ВЭД от Вилетех" }],
  }),
  component: AdminPage,
});
