import { useCallback, useEffect, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import {
  findCapabilityLabel,
  getProcessRoles,
  influenceLabel,
  updateProcessRole,
  updateProcessRolePriorities,
  type CapabilityCatalogEntry,
  type ProcessRoleInfluence,
  type ProcessRoleRow,
} from "@/lib/api/process-roles";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { useAuth } from "@/lib/auth/session";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { cn } from "@/lib/utils";

const INFLUENCE_OPTIONS: ProcessRoleInfluence[] = ["actor", "observer", "none"];

export function ProcessRolesPage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const { session } = usePlatformStore();
  const role = session?.role ?? auth.role;
  const [rows, setRows] = useState<ProcessRoleRow[]>([]);
  const [catalog, setCatalog] = useState<CapabilityCatalogEntry[]>([]);
  const [allCaps, setAllCaps] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capsOpen, setCapsOpen] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (mode !== "app") return;
    const data = await getProcessRoles();
    setRows(data.roles.filter((row) => row.role !== "root"));
    setVersion(data.version);
    setNote(data.note ?? "");
    setCatalog(data.capabilities_catalog ?? []);
    setAllCaps(data.capabilities ?? []);
  }, [mode]);

  useEffect(() => {
    if (mode !== "app" || role !== "root") return;
    void reload().catch((err: Error) => setError(err.message));
  }, [mode, role, reload]);

  if (role !== "root") {
    return (
      <VedAppShell title="Доступ ограничен">
        <div className="panel p-6 text-sm text-muted-foreground">Раздел доступен только суперадмину.</div>
      </VedAppShell>
    );
  }

  if (mode !== "app") {
    return (
      <VedAppShell title="Роли процесса">
        <div className="panel space-y-3 p-6 text-sm text-muted-foreground">
          <p>Управление участием ролей доступно в app-режиме (JWT + core API).</p>
          <p className="text-foreground">Порядок ролей не меняет этапы заявки и методологию — только участие и приоритет.</p>
        </div>
      </VedAppShell>
    );
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    const order = rows.map((r) => r.role);
    const tmp = order[index];
    order[index] = order[next];
    order[next] = tmp;
    setBusy(true);
    setError(null);
    try {
      await updateProcessRolePriorities(order);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка приоритетов");
    } finally {
      setBusy(false);
    }
  }

  async function patchRole(roleId: string, body: Parameters<typeof updateProcessRole>[1]) {
    setBusy(true);
    setError(null);
    try {
      await updateProcessRole(roleId, body);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(row: ProcessRoleRow) {
    const nextEnabled = !row.enabled;
    // Leaving the process clears mandatory so the toggle is never deadlocked.
    await patchRole(row.role, nextEnabled ? { enabled: true } : { enabled: false, mandatory: false });
  }

  async function toggleMandatory(row: ProcessRoleRow) {
    const nextMandatory = !row.mandatory;
    if (nextMandatory && !row.enabled) {
      await patchRole(row.role, { mandatory: true, enabled: true });
      return;
    }
    await patchRole(row.role, { mandatory: nextMandatory });
  }

  async function setInfluence(row: ProcessRoleRow, influence: ProcessRoleInfluence) {
    let caps = row.capabilities;
    if (influence === "observer") {
      caps = caps.filter((id) => {
        const label = findCapabilityLabel(catalog, id);
        return id === "form.view" || id === "sales.attribution" || label.id === "form.view";
      });
      if (!caps.includes("form.view")) caps = ["form.view", ...caps];
    }
    await patchRole(row.role, { influence, capabilities: caps });
  }

  async function toggleCap(row: ProcessRoleRow, capId: string) {
    const has = row.capabilities.includes(capId);
    const next = has ? row.capabilities.filter((c) => c !== capId) : [...row.capabilities, capId];
    await patchRole(row.role, { capabilities: next });
  }

  return (
    <VedAppShell title="Роли процесса">
      <div className="space-y-4">
        <div className="panel space-y-2 p-4 text-sm">
          <p className="font-semibold text-foreground">Участие ролей в фиксированном процессе</p>
          <p className="text-muted-foreground">
            {note ||
              "Порядок ролей ≠ этапы заявки. Суперадмин вне бизнес-процесса. Влияние, участие и «обязательная» правятся по месту; изменения шаблона роли глобальны."}
          </p>
          <p className="text-xs text-muted-foreground">Версия конфигурации: {version}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Приоритет</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Влияние</th>
                <th className="px-3 py-2">В процессе</th>
                <th className="px-3 py-2">Обязательная</th>
                <th className="px-3 py-2">Права</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.role} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 tabular-nums">{row.priority}</td>
                  <td className="px-3 py-2 font-medium">{row.role}</td>
                  <td className="px-3 py-2">
                    <select
                      className="field max-w-[14rem] text-xs"
                      disabled={busy}
                      value={row.influence}
                      title={influenceLabel(row.influence)}
                      onChange={(e) => void setInfluence(row, e.target.value as ProcessRoleInfluence)}
                    >
                      {INFLUENCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {influenceLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleEnabled(row)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        row.enabled ? "bg-done-soft text-done" : "bg-muted text-muted-foreground",
                        busy && "opacity-50",
                      )}
                      title={
                        row.mandatory && row.enabled
                          ? "Отключение снимет также флаг «обязательная»"
                          : undefined
                      }
                    >
                      {row.enabled ? "да" : "нет"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleMandatory(row)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        row.mandatory ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
                        busy && "opacity-50",
                      )}
                    >
                      {row.mandatory ? "да" : "нет"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <ul className="space-y-1 text-xs">
                      {row.capabilities.map((id) => {
                        const label = findCapabilityLabel(catalog, id);
                        return (
                          <li key={id} title={label.description || id}>
                            <span className="text-foreground">{label.title}</span>
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">{id}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      disabled={busy}
                      className="mt-1 text-xs text-primary hover:underline"
                      onClick={() => setCapsOpen(capsOpen === row.role ? null : row.role)}
                    >
                      {capsOpen === row.role ? "Скрыть каталог" : "Изменить права"}
                    </button>
                    {capsOpen === row.role ? (
                      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border border-border p-2">
                        {(catalog.length > 0 ? catalog.map((c) => c.id) : allCaps).map((id) => {
                          const label = findCapabilityLabel(catalog, id);
                          const checked = row.capabilities.includes(id);
                          return (
                            <label key={id} className="flex cursor-pointer items-start gap-2 text-xs">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                disabled={busy}
                                onChange={() => void toggleCap(row, id)}
                              />
                              <span>
                                <span className="font-medium text-foreground">{label.title}</span>
                                {label.description ? (
                                  <span className="block text-muted-foreground">{label.description}</span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => void move(index, -1)}
                        className={cn("rounded px-2 py-1 text-xs hover:bg-muted", busy && "opacity-50")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === rows.length - 1}
                        onClick={() => void move(index, 1)}
                        className={cn("rounded px-2 py-1 text-xs hover:bg-muted", busy && "opacity-50")}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VedAppShell>
  );
}
