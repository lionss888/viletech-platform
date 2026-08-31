import { createFileRoute } from "@tanstack/react-router";

import { FormDetail } from "@/components/ved/pages/form-detail-page";

export const Route = createFileRoute("/forms/$id")({
  head: () => ({
    meta: [{ title: "Карточка заявки — ВЭД от Вилетех" }],
  }),
  component: FormDetail,
});
