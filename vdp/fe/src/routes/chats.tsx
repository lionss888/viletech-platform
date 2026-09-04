import { createFileRoute } from "@tanstack/react-router";

import { ChatsPage } from "@/components/ved/pages/chats-page";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [{ title: "Рабочие чаты — ВЭД от Вилетех" }],
  }),
  component: ChatsPage,
});
