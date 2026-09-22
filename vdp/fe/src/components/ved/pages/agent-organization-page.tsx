import { VedAppShell } from "@/components/ved/VedAppShell";
import { useAuth } from "@/lib/auth/session";
import {
  organizationStatusLabel,
  resolveAgentOrganizationCard,
  ROOT_ORG_PLACE_LINE,
} from "@/lib/ved/agent-organization";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";

const ORG_STATUS_CLASS: Record<string, string> = {
  approved: "bg-done-soft text-done",
  waiting_verification: "bg-wait-soft text-wait",
  not_approved: "bg-return-soft text-return",
  blocked: "bg-destructive-soft text-destructive",
};

/** Manager root organization card; root sees place-outside line. */
export function AgentOrganizationPage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const { session, organizations } = usePlatformStore();
  const role = mode === "demo" ? session?.role : auth.role;
  const organizationId =
    mode === "demo" ? undefined : auth.account?.organization_id;

  const resolved = resolveAgentOrganizationCard({
    role,
    organizationId,
    organizations,
  });

  return (
    <VedAppShell title="Корневая организация" subtitle="Организация менеджера в контуре платформы">
      {resolved.kind === "root_outside" && (
        <div className="panel max-w-lg space-y-2 p-6" data-testid="agent-org-root-outside">
          <p className="text-sm font-semibold">{ROOT_ORG_PLACE_LINE}</p>
          <p className="text-sm text-muted-foreground">
            У суперадмина нет привязки к организации менеджера — карточка агента здесь не показывается.
          </p>
        </div>
      )}
      {resolved.kind === "missing" && (
        <div className="panel max-w-lg space-y-2 p-6" data-testid="agent-org-missing">
          <p className="text-sm font-semibold">Организация не привязана</p>
          <p className="text-sm text-muted-foreground">
            У этой учётки нет organization_id. Для сид-менеджера организация задаётся в core seed.
          </p>
        </div>
      )}
      {resolved.kind === "card" && (
        <div className="panel max-w-lg space-y-4 p-6" data-testid="agent-org-card">
          <div>
            <p className="label-caps">Название</p>
            <p className="text-base font-semibold" data-testid="agent-org-name">
              {resolved.organization.name}
            </p>
          </div>
          <div>
            <p className="label-caps">ИНН</p>
            <p className="font-mono text-sm" data-testid="agent-org-inn">
              {resolved.organization.inn}
            </p>
          </div>
          <div>
            <p className="label-caps">Статус</p>
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${ORG_STATUS_CLASS[resolved.organization.status] ?? "bg-muted text-muted-foreground"}`}
              data-testid="agent-org-status"
            >
              {organizationStatusLabel(resolved.organization.status)}
            </span>
          </div>
        </div>
      )}
    </VedAppShell>
  );
}
