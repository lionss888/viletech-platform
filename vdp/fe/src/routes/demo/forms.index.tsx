import { createFileRoute } from "@tanstack/react-router";

import { FormsList } from "@/routes/forms.index";

export const Route = createFileRoute("/demo/forms/")({
  component: FormsList,
});
