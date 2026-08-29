import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/components/ved/pages/dashboard-page";

export const Route = createFileRoute("/demo/dashboard")({
  head: () => ({
    meta: [
      { title: "Рабочий стол — ВЭД от Вилетех" },
      { name: "description", content: "Стартовый экран роли: задачи, требующие действия, сделки в работе, платежи и отгрузки." },
      { property: "og:title", content: "Рабочий стол — ВЭД от Вилетех" },
      { property: "og:description", content: "Задачи роли, сделки в работе и последние обновления." },
    ],
  }),
  component: DashboardPage,
});
