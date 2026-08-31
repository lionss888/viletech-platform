import { createFileRoute } from "@tanstack/react-router";

import { CountriesPage } from "./demo/countries";

export const Route = createFileRoute("/countries")({
  head: () => ({
    meta: [{ title: "Страны и риски — ВЭД от Вилетех" }],
  }),
  component: CountriesPage,
});
