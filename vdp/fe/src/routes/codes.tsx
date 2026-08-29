import { createFileRoute } from "@tanstack/react-router";

import { CodesPage } from "./demo/codes";

export const Route = createFileRoute("/codes")({
  head: () => ({
    meta: [{ title: "Коды ТН ВЭД — ВЭД от Вилетех" }],
  }),
  component: CodesPage,
});
