import { VedAppShell } from "@/components/ved/VedAppShell";
import { useAuth } from "@/lib/auth/session";
import { getFeatureFlags, isFeatureDisabled, toggleFeatureFlag, useFeatureFlags } from "@/lib/ved/feature-flags";
import { MAIN_NAV, REFERENCE_NAV, type NavItem } from "@/lib/ved/nav-config";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { ROLES } from "@/lib/ved/roles";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

/** Роли, которыми может управлять суперадмин (сам root не отключается). */
const MANAGEABLE_ROLES = ROLES.filter((r) => r.id !== "root");

function uniqueItems(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.segment}|${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Видимые строки: пункт показываем, если у него есть хотя бы одна управляемая роль. */
function manageableItems(items: NavItem[]): NavItem[] {
  return uniqueItems(items).filter((item) => {
    if (item.roles === "all") return true;
    return item.roles.some((r) => r !== "root");
  });
}

function rolesFor(item: NavItem): VedRole[] {
  const base = item.roles === "all" ? MANAGEABLE_ROLES.map((r) => r.id) : item.roles;
  return base.filter((r) => r !== "root");
}

export function FeatureFlagsPage() {
  const auth = useAuth();
  const { session } = usePlatformStore();
  const role = session?.role ?? auth.role;
  const flags = useFeatureFlags();

  if (role !== "root") {
    return (
      <VedAppShell title="Доступ ограничен">
        <div className="panel p-6 text-sm text-muted-foreground">Раздел доступен только суперадмину.</div>
      </VedAppShell>
    );
  }

  const sections = [
    { title: "Основные разделы", items: manageableItems(MAIN_NAV) },
    { title: "Справочники", items: manageableItems(REFERENCE_NAV) },
  ];

  return (
    <VedAppShell
      title="Разрешения разделов"
      subtitle="Включите или выключите разделы для участников — выключенный раздел скрывается из меню и недоступен по ссылке"
    >
      <div className="space-y-4">
        <div className="panel space-y-2 p-4 text-sm">
          <p className="font-semibold text-foreground">Как это работает</p>
          <p className="text-muted-foreground">
            Переключатель «выкл» убирает раздел из меню участника и закрывает к нему доступ. Суперадмин всегда видит все
            разделы, чтобы не потерять управление. Настройки хранятся в этом браузере.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="panel overflow-x-auto">
            <p className="label-caps px-4 pt-4">{section.title}</p>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Раздел</th>
                  {MANAGEABLE_ROLES.map((r) => (
                    <th key={r.id} className="px-3 py-2 whitespace-nowrap">
                      {r.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.items.map((item) => {
                  const itemRoles = rolesFor(item);
                  return (
                    <tr key={`${item.segment}|${item.label}`} className="border-t border-border/60">
                      <td className="px-4 py-2">
                        <span className="font-medium">{item.label}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{item.segment}</span>
                      </td>
                      {MANAGEABLE_ROLES.map((r) => {
                        const applicable = itemRoles.includes(r.id);
                        const disabled = isFeatureDisabled(flags, item.segment, r.id);
                        return (
                          <td key={r.id} className="px-3 py-2">
                            {applicable ? (
                              <button
                                type="button"
                                onClick={() => toggleFeatureFlag(item.segment, r.id)}
                                className={cn(
                                  "rounded px-2 py-1 text-xs font-medium",
                                  disabled ? "bg-muted text-muted-foreground" : "bg-done-soft text-done",
                                )}
                                title={disabled ? "Раздел выключен — нажмите, чтобы включить" : "Раздел включён — нажмите, чтобы выключить"}
                              >
                                {disabled ? "выкл" : "вкл"}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground" title="Роли раздел недоступен по умолчанию">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {Object.keys(flags).length > 0 && (
          <p className="text-xs text-muted-foreground">
            Активных ограничений: {Object.values(flags).reduce((acc, list) => acc + list.length, 0)}
          </p>
        )}
      </div>
    </VedAppShell>
  );
}
