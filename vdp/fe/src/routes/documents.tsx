import { createFileRoute } from "@tanstack/react-router";

import { DocumentsPage } from "./demo/documents";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [{ title: "Документы — ВЭД от Вилетех" }],
  }),
  component: DocumentsPage,
});
