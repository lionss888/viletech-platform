import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [{ title: "Организации — Viletech ВЭД" }],
  }),
  component: OrganizationsStub,
});

function OrganizationsStub() {
  return (
    <AppShell title="Организации" subtitle="Stub — следующий этап">
      <div className="panel p-6 text-sm text-muted-foreground">
        Справочник организаций через API подключим отдельно. Полный UI на моках:{" "}
        <Link to="/demo/organizations" className="font-semibold text-accent hover:underline">
          /demo/organizations
        </Link>
        .
      </div>
    </AppShell>
  );
}
