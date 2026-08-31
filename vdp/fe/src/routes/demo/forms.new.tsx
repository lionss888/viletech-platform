import { createFileRoute } from "@tanstack/react-router";

import { NewForm } from "@/routes/forms.new";

export const Route = createFileRoute("/demo/forms/new")({
  component: NewForm,
});
