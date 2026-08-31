import { createFileRoute } from "@tanstack/react-router";

import { FormsList } from "@/components/ved/pages/forms-list-page";
import { parseFormsSearch } from "@/lib/ved/forms-search";

export const Route = createFileRoute("/demo/forms/")({
  validateSearch: parseFormsSearch,
  head: () => ({
    meta: [
      { title: "Реестр платёжных заявок — ВЭД от Вилетех" },
      { name: "description", content: "Реестр заявок ВЭД с фильтрами по стадии, направлению и очередям роли: комплаенс, договор, поручение, платёж, отгрузка." },
      { property: "og:title", content: "Реестр платёжных заявок — ВЭД от Вилетех" },
      { property: "og:description", content: "Фильтры по стадиям жизненного цикла, массовые действия и очереди по роли." },
    ],
  }),
  component: FormsList,
});
