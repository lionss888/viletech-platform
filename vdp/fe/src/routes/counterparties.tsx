import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";

export const Route = createFileRoute("/counterparties")({
  head: () => ({
    meta: [{ title: "Контрагенты — Viletech ВЭД" }],
  }),
  component: CounterpartiesStub,
});

function CounterpartiesStub() {
  return (
    <AppShell title="Контрагенты" subtitle="Stub — следующий этап">
      <div className="panel p-6 text-sm text-muted-foreground">
        Справочник контрагентов через API — в следующем этапе. Демо:{" "}
        <Link to="/demo/counterparties" className="font-semibold text-accent hover:underline">
          /demo/counterparties
        </Link>
        .
      </div>
    </AppShell>
  );
}
