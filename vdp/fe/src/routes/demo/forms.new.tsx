import { createFileRoute } from "@tanstack/react-router";

import { NewForm } from "@/components/ved/pages/forms-new-page";

export const Route = createFileRoute("/demo/forms/new")({
  head: () => ({
    meta: [
      { title: "Новая платёжная заявка — ВЭД от Вилетех" },
      { name: "description", content: "Пошаговое создание платёжной заявки ВЭД: направление, контрагент, сумма, инвойс и отправка на комплаенс." },
      { property: "og:title", content: "Новая платёжная заявка — ВЭД от Вилетех" },
      { property: "og:description", content: "Мастер создания заявки: направление, контрагент, сумма и документы." },
    ],
  }),
  component: NewForm,
});
