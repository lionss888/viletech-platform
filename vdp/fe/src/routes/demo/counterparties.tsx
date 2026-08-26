import { createFileRoute } from "@tanstack/react-router";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { useVed } from "@/lib/ved/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/counterparties")({
  head: () => ({
    meta: [
      { title: "Контрагенты — Viletech ВЭД" },
      { name: "description", content: "Справочник иностранных контрагентов ВЭД: банк, SWIFT, страна и статус проверки комплаенсом." },
      { property: "og:title", content: "Контрагенты — Viletech ВЭД" },
      { property: "og:description", content: "Банк, SWIFT, страна и статус проверки по каждому контрагенту." },
    ],
  }),
  component: CounterpartiesPage,
});

function CounterpartiesPage() {
  const { counterparties, forms } = useVed();

  return (
    <DemoAppShell title="Контрагенты" subtitle={`В справочнике: ${counterparties.length}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {counterparties.map((cp) => {
          const used = forms.filter((f) => f.counterpartyId === cp.id).length;
          return (
            <div key={cp.id} className="panel p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{cp.name}</p>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold",
                    cp.status === "approved" ? "bg-done-soft text-done" : "bg-return-soft text-return",
                  )}
                >
                  {cp.status === "approved" ? "Проверен" : "Не проверен"}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div>
                  Страна: <span className="font-mono text-foreground">{cp.country} ({cp.countryCode})</span>
                </div>
                <div>Банк: <span className="text-foreground">{cp.bank}</span></div>
                <div>
                  SWIFT: <span className="font-mono text-foreground">{cp.swift}</span>
                </div>
                <div>
                  Заявок: <span className="font-mono text-foreground">{used}</span>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </DemoAppShell>
  );
}
