import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/components/ved/pages/profile-page";

export const Route = createFileRoute("/demo/profile")({
  head: () => ({
    meta: [{ title: "Профиль — ВЭД от Вилетех" }],
  }),
  component: ProfilePage,
});
