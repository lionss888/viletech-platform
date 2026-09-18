import { createFileRoute } from "@tanstack/react-router";

import { FeatureFlagsPage } from "@/components/ved/pages/feature-flags-page";

export const Route = createFileRoute("/demo/feature-flags")({
  head: () => ({
    meta: [
      { title: "Разрешения разделов — ⚡ Веди ВЭД ₽" },
      { name: "description", content: "Включение и выключение разделов платформы для участников процесса." },
    ],
  }),
  component: FeatureFlagsPage,
});
