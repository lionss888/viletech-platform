import { createFileRoute } from "@tanstack/react-router";

import { FormDetail } from "@/components/ved/pages/form-detail-page";

export const Route = createFileRoute("/demo/forms/$id")({
  head: () => ({
    meta: [
      { title: "Карточка платёжной заявки — ⚡ Веди ВЭД ₽" },
      { name: "description", content: "Детали платёжной заявки ВЭД: стадии, документы, хронология событий и действия по роли." },
      { property: "og:title", content: "Карточка платёжной заявки — ⚡ Веди ВЭД ₽" },
      { property: "og:description", content: "Стадии, документы, хронология и доступные действия по заявке." },
    ],
  }),
  component: FormDetail,
});
