import { createFileRoute } from "@tanstack/react-router";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { REGISTRIES } from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";

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

function CountriesPage() {
  const { counterparties, countries } = useVed();
  const def = REGISTRIES.countries;

  return (
    <DemoAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${countries.length}`}>
      <RegistryManager
        def={def}
        extraColumns={[
          {
            label: "Контрагентов",
            value: (record) => String(counterparties.filter((cp) => cp.countryCode === record["code"]).length),
          },
        ]}
      />
    </DemoAppShell>
  );
}
