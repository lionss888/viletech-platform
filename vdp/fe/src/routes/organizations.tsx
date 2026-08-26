import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";
import { dateOnly } from "@/lib/ved/format";
import { useVed } from "@/lib/ved/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Организации клиентов — Viletech ВЭД" },
      { name: "description", content: "Организации клиентов ВЭД: ИНН, юридический адрес и статус верификации внутренним комплаенсом." },
      { property: "og:title", content: "Организации клиентов — Viletech ВЭД" },
      { property: "og:description", content: "ИНН, адрес и статус верификации по каждой организации." },
    ],
  }),
  component: OrganizationsPage,
});

const LABEL = {
  approved: { text: "Одобрена", cls: "bg-done-soft text-done" },
  waiting_verification: { text: "Ожидает проверки", cls: "bg-wait-soft text-wait" },
  not_approved: { text: "Не одобрена", cls: "bg-return-soft text-return" },
};

function OrganizationsPage() {
  const { organizations, forms } = useVed();

  return (
    <AppShell title="Организации клиентов" subtitle={`Всего: ${organizations.length}`}>
      <div className="panel overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-caps py-2 pr-4">Организация</th>
              <th className="label-caps py-2 pr-4">ИНН</th>
              <th className="label-caps py-2 pr-4">Адрес</th>
              <th className="label-caps py-2 pr-4">Статус</th>
              <th className="label-caps py-2 pr-4 text-right">Заявок</th>
              <th className="label-caps py-2 pr-4">Создана</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-border/60">
                <td className="py-2 pr-4 font-medium">{org.name}</td>
                <td className="py-2 pr-4 font-mono text-xs">{org.inn}</td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">{org.legalAddress}</td>
                <td className="py-2 pr-4">
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", LABEL[org.status].cls)}>
                    {LABEL[org.status].text}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs">{forms.filter((f) => f.organizationId === org.id).length}</td>
                <td className="py-2 pr-4 font-mono text-[11px] text-muted-foreground">{dateOnly(org.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
