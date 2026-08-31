import { createFileRoute } from "@tanstack/react-router";

import { parseFormsSearch } from "@/lib/ved/forms-search";
import { FormsList } from "@/components/ved/pages/forms-list-page";

export const Route = createFileRoute("/forms/")({
  head: () => ({
    meta: [{ title: "Реестр заявок — ВЭД от Вилетех" }],
  }),
  validateSearch: parseFormsSearch,
  component: FormsList,
});
