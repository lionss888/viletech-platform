import { createFileRoute } from "@tanstack/react-router";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/counterparties")({
  head: () => ({
    meta: [
      { title: "Контрагенты — ВЭД от Вилетех" },
      { name: "description", content: "Справочник контрагентов ВЭД: банк, SWIFT, страна и статус проверки комплаенсом. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Контрагенты — ВЭД от Вилетех" },
      { property: "og:description", content: "Банк, SWIFT, страна и статус проверки по каждому контрагенту." },
    ],
  }),
  component: CounterpartiesPage,
});

export function CounterpartiesPage() {
  const { counterparties, forms } = usePlatformStore();
  const def = REGISTRIES.counterparties;

  return (
    <VedAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${counterparties.length}`}>
      <RegistryManager
        def={def}
        writeRoles={["user", "manager", "compliance_officer", "internal_compliance_officer"]}
        badge={(record) =>
          record["status"] === "approved"
            ? { text: "Проверен", cls: "bg-done-soft text-done" }
            : { text: "Не проверен", cls: "bg-return-soft text-return" }
        }
        extraColumns={[
          {
            label: "Заявок",
            value: (record) => String(forms.filter((f) => f.counterpartyId === record["id"]).length),
          },
        ]}
      />
    </VedAppShell>
  );
}
