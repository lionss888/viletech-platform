import { createFileRoute } from "@tanstack/react-router";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/codes")({
  head: () => ({
    meta: [
      { title: "Коды ТН ВЭД — ВЭД от Вилетех" },
      { name: "description", content: "Справочник кодов ТН ВЭД: наименование, пошлина и требование лицензии. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Коды ТН ВЭД — ВЭД от Вилетех" },
      { property: "og:description", content: "Наименования, пошлины и лицензирование по кодам ТН ВЭД." },
    ],
  }),
  component: CodesPage,
});

export function CodesPage() {
  const { forms, hsCodes } = usePlatformStore();
  const def = REGISTRIES.hsCodes;

  return (
    <VedAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${hsCodes.length}`}>
      <RegistryManager
        def={def}
        extraColumns={[
          {
            label: "Заявок",
            value: (record) => String(forms.filter((f) => f.hsCode === record["code"]).length),
          },
        ]}
      />
    </VedAppShell>
  );
}
