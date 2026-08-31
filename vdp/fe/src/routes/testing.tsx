import { createFileRoute } from "@tanstack/react-router";

import { TestingPage } from "./demo/testing";

export const Route = createFileRoute("/testing")({
  head: () => ({
    meta: [{ title: "Проверка сценариев — ВЭД от Вилетех" }],
  }),
  component: TestingPage,
});
