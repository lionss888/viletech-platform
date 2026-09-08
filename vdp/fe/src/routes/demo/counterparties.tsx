import { createFileRoute } from "@tanstack/react-router";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { isComplianceRole } from "@/lib/ved/compliance";
import { REGISTRIES } from "@/lib/ved/registry";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/counterparties")({
  head: () => ({
    meta: [
      { title: "Контрагенты — ⚡ Веди ВЭД ₽" },
      { name: "description", content: "Справочник контрагентов ВЭД: банк, SWIFT, страна и статус проверки комплаенсом. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Контрагенты — ⚡ Веди ВЭД ₽" },
      { property: "og:description", content: "Банк, SWIFT, страна и статус проверки по каждому контрагенту." },
    ],
  }),
  component: CounterpartiesPage,
});

export function CounterpartiesPage() {
  const { counterparties, forms, session } = usePlatformStore();
  const def = REGISTRIES.counterparties;
  const canSetApproval = isComplianceRole(session?.role) || session?.role === "root";

  return (
    <VedAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${counterparties.length}`}>
      <RegistryManager
        def={def}
        writeRoles={["user", "manager", "compliance_officer", "internal_compliance_officer"]}
        hideFormKeys={canSetApproval ? [] : ["status"]}
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
