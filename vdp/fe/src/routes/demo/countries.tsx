import { createFileRoute } from "@tanstack/react-router";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/countries")({
  head: () => ({
    meta: [
      { title: "Страны и риски — ВЭД от Вилетех" },
      { name: "description", content: "Справочник стран и уровней риска для комплаенс-проверки. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Страны и риски — ВЭД от Вилетех" },
      { property: "og:description", content: "Уровень риска страны и число контрагентов по каждой стране." },
    ],
  }),
  component: CountriesPage,
});

export function CountriesPage() {
  const { counterparties, countries } = usePlatformStore();
  const def = REGISTRIES.countries;

  return (
    <VedAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${countries.length}`}>
      <RegistryManager
        def={def}
        extraColumns={[
          {
            label: "Контрагентов",
            value: (record) => String(counterparties.filter((cp) => cp.countryCode === record["code"]).length),
          },
        ]}
      />
    </VedAppShell>
  );
}
