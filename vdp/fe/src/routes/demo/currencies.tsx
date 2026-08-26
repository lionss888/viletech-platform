import { createFileRoute } from "@tanstack/react-router";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { money } from "@/lib/ved/format";
import { REGISTRIES } from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/demo/currencies")({
  head: () => ({
    meta: [
      { title: "Валюты расчётов — ВЭД от Вилетех" },
      { name: "description", content: "Справочник валют расчётов: курс, статус доступности и объём заявок. Добавление, редактирование и загрузка данных." },
      { property: "og:title", content: "Валюты расчётов — ВЭД от Вилетех" },
      { property: "og:description", content: "Курсы, ограничения и объёмы по валютам расчётов." },
    ],
  }),
  component: CurrenciesPage,
});

function CurrenciesPage() {
  const { forms, currencies } = useVed();
  const def = REGISTRIES.currencies;

  return (
    <DemoAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${currencies.length}`}>
      <RegistryManager
        def={def}
        badge={(record) =>
          record["status"] === "active"
            ? { text: "Доступна", cls: "bg-done-soft text-done" }
            : { text: "С ограничениями", cls: "bg-wait-soft text-wait" }
        }
        extraColumns={[
          {
            label: "Заявок",
            value: (record) => String(forms.filter((f) => f.currency === record["code"]).length),
          },
          {
            label: "Объём",
            value: (record) =>
              money(
                forms.filter((f) => f.currency === record["code"]).reduce((acc, f) => acc + f.amountMinor, 0),
                String(record["code"]),
              ),
          },
        ]}
      />
    </DemoAppShell>
  );
}
