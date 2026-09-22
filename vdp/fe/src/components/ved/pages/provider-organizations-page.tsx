import { VedAppShell } from "@/components/ved/VedAppShell";
import { filterProviderOrganizations, organizationStatusLabel } from "@/lib/ved/agent-organization";
import { usePlatformStore } from "@/lib/ved/platform-store";

/** List of organizations with type=provider (not payment agents). */
export function ProviderOrganizationsPage() {
  const { organizations } = usePlatformStore();
  const rows = filterProviderOrganizations(organizations);

  return (
    <VedAppShell
      title="Организации провайдеров"
      subtitle="Организации с типом provider — не каталог платёжных агентов"
    >
      {rows.length === 0 ? (
        <div className="panel max-w-lg space-y-2 p-6" data-testid="provider-orgs-empty">
          <p className="text-sm font-semibold">Нет организаций провайдеров</p>
          <p className="text-sm text-muted-foreground">
            Когда появятся организации с типом provider, они отобразятся в этом списке.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden" data-testid="provider-orgs-list">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Название</th>
                <th className="px-4 py-2 font-medium">ИНН</th>
                <th className="px-4 py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => (
                <tr key={org.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{org.inn}</td>
                  <td className="px-4 py-3 text-xs">{organizationStatusLabel(org.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </VedAppShell>
  );
}
