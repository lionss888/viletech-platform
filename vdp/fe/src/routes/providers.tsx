import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [
      { title: "Провайдеры платежей — ВЭД от Вилетех" },
      { name: "description", content: "Справочник провайдеров исполнения платежей: страна, валютные коридоры, контакты и SLA. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Провайдеры платежей — ВЭД от Вилетех" },
      { property: "og:description", content: "Валютные коридоры, контакты и SLA по каждому провайдеру." },
    ],
  }),
  component: ProvidersPage,
});

function ProvidersPage() {
  const { providers } = useVed();
  const def = REGISTRIES.providers;

  return (
    <AppShell title={def.title} subtitle={`${def.subtitle} · записей: ${providers.length}`}>
      <RegistryManager
        def={def}
        badge={(record) =>
          record["status"] === "active"
            ? { text: "Активен", cls: "bg-done-soft text-done" }
            : { text: "Приостановлен", cls: "bg-wait-soft text-wait" }
        }
      />
    </AppShell>
  );
}
