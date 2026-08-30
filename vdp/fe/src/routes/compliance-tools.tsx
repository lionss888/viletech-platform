import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/compliance-tools")({
  head: () => ({
    meta: [
      { title: "Инструменты комплаенс — ВЭД от Вилетех" },
      {
        name: "description",
        content:
          "Справочник отметок комплаенс: причина возврата заявки или организации на доработку и инструкция клиенту. Создание, редактирование и загрузка отметок.",
      },
      { property: "og:title", content: "Инструменты комплаенс — ВЭД от Вилетех" },
      { property: "og:description", content: "Отметки возврата на доработку и инструкции для клиента." },
    ],
  }),
  component: ComplianceToolsPage,
});

const SCOPE: Record<string, { text: string; cls: string }> = {
  form: { text: "Заявка", cls: "bg-work-soft text-work" },
  organization: { text: "Организация", cls: "bg-wait-soft text-wait" },
  both: { text: "Заявка и организация", cls: "bg-neutral-tone-soft text-neutral-tone" },
};

function ComplianceToolsPage() {
  const { complianceTools } = useVed();
  const def = REGISTRIES.complianceTools;

  return (
    <AppShell title={def.title} subtitle={`${def.subtitle} · отметок: ${complianceTools.length}`}>
      <RegistryManager
        def={def}
        extraColumns={[
          { label: "Контур", value: (record) => SCOPE[String(record["scope"])]?.text ?? "—" },
        ]}
      />
    </AppShell>
  );
}
