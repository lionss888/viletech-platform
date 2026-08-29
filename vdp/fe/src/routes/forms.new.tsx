import { createFileRoute } from "@tanstack/react-router";

import { NewForm } from "@/components/ved/pages/forms-new-page";

export const Route = createFileRoute("/forms/new")({
  head: () => ({
    meta: [{ title: "Новая заявка — ВЭД от Вилетех" }],
  }),
  component: NewForm,
});
