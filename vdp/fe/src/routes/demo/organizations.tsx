import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { RegistryManager } from "@/components/ved/RegistryManager";
import { SubjectReview } from "@/components/ved/SubjectReview";
import { isComplianceRole, subjectState, type ReviewSubject } from "@/lib/ved/compliance";
import { REGISTRIES } from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/organizations")({
  head: () => ({
    meta: [
      { title: "Организации клиентов — ВЭД от Вилетех" },
      { name: "description", content: "Организации клиентов ВЭД: ИНН, юридический адрес и статус верификации комплаенсом." },
      { property: "og:title", content: "Организации клиентов — ВЭД от Вилетех" },
      { property: "og:description", content: "ИНН, адрес и статус верификации по каждой организации." },
    ],
  }),
  component: OrganizationsPage,
});

const LABEL: Record<string, { text: string; cls: string }> = {
  approved: { text: "Одобрена", cls: "bg-done-soft text-done" },
  waiting_verification: { text: "Ожидает проверки", cls: "bg-wait-soft text-wait" },
  not_approved: { text: "Не одобрена", cls: "bg-return-soft text-return" },
  blocked: { text: "Заблокирована", cls: "bg-destructive-soft text-destructive" },
};

function OrganizationsPage() {
  const { session } = useVed();
  return isComplianceRole(session?.role) ? <ComplianceOrganizations /> : <OrganizationsRegistry />;
}

/* ------------------------- Комплаенс: проверка ------------------------- */

function ComplianceOrganizations() {
  const { organizations, forms } = useVed();
  const [tab, setTab] = useState<"pending" | "cleared">("pending");

  const subjects: ReviewSubject[] = useMemo(
    () =>
      organizations.map((org) => {
        const raw = org as unknown as Record<string, string | undefined>;
        return {
          key: "organizations" as const,
          id: org.id,
          kind: "Организация клиента" as const,
          name: org.name,
          detail: `ИНН ${org.inn} · ${org.legalAddress}`,
          status: org.status,
          note: raw["complianceNote"],
          mark: raw["complianceMark"],
        };
      }),
    [organizations],
  );

  const pending = subjects.filter((s) => !subjectState(s.status).ok);
  const cleared = subjects.filter((s) => subjectState(s.status).ok);
  const shown = tab === "pending" ? pending : cleared;

  return (
    <DemoAppShell
      title="Проверка организаций"
      subtitle={`Требуют проверки: ${pending.length} · прошли проверку: ${cleared.length}`}
    >
      <div className="flex gap-2">
        {(
          [
            { id: "pending" as const, label: `Требуют проверки (${pending.length})` },
            { id: "cleared" as const, label: `Прошли проверку (${cleared.length})` },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              tab === item.id ? "bg-primary text-primary-foreground" : "bg-card shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <SubjectReview subjects={shown} readOnly={tab === "cleared"} />
      </div>

      <section className="panel mt-4 p-4">
        <p className="label-caps">Заявки организаций, ожидающих проверки</p>
        <ul className="mt-3 divide-y divide-border">
          {forms
            .filter((form) => pending.some((s) => s.id === form.organizationId))
            .slice(0, 8)
            .map((form) => (
              <li key={form.id} className="flex flex-wrap items-center gap-3 py-2.5 text-xs">
                <Link to="/demo/forms/$id" params={{ id: form.id }} className="font-mono font-semibold hover:underline">
                  {form.number}
                </Link>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{form.ownerName}</span>
              </li>
            ))}
          {forms.filter((form) => pending.some((s) => s.id === form.organizationId)).length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">Все организации по заявкам проверены.</li>
          )}
        </ul>
      </section>
    </DemoAppShell>
  );
}

/* ------------------------- Справочник ------------------------- */

function OrganizationsRegistry() {
  const { organizations, forms } = useVed();
  const def = REGISTRIES.organizations;

  return (
    <DemoAppShell title={def.title} subtitle={`${def.subtitle} · записей: ${organizations.length}`}>
      <RegistryManager
        def={def}
        badge={(record) => LABEL[String(record["status"])] ?? null}
        extraColumns={[
          {
            label: "Заявок",
            value: (record) => String(forms.filter((f) => f.organizationId === record["id"]).length),
          },
        ]}
      />
    </DemoAppShell>
  );
}
