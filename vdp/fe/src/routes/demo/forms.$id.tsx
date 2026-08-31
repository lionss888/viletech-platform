import { createFileRoute } from "@tanstack/react-router";

import { FormDetail } from "@/routes/forms.$id";

export const Route = createFileRoute("/demo/forms/$id")({
  component: FormDetail,
});
