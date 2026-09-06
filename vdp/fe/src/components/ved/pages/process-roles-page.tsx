import { useCallback, useEffect, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import {
  getProcessRoles,
  updateProcessRole,
  updateProcessRolePriorities,
  type ProcessRoleRow,
} from "@/lib/api/process-roles";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { useAuth } from "@/lib/auth/session";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { cn } from "@/lib/utils";

export function ProcessRolesPage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const { session } = usePlatformStore();
  const role = session?.role ?? auth.role;
  const [rows, setRows] = useState<ProcessRoleRow[]>([]);
  const [note, setNote] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (mode !== "app") return;
    const data = await getProcessRoles();
    setRows(data.roles);
    setVersion(data.version);
    setNote(data.note ?? "");
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

  async function toggleEnabled(row: ProcessRoleRow) {
    if (row.mandatory && row.enabled) {
      setError("Обязательную роль процесса нельзя отключить (методология фиксирована в коде).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProcessRole(row.role, { enabled: !row.enabled });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <VedAppShell title="Роли процесса">
      <div className="space-y-4">
        <div className="panel space-y-2 p-4 text-sm">
          <p className="font-semibold text-foreground">Участие ролей в фиксированном процессе</p>
          <p className="text-muted-foreground">
            {note || "Порядок ролей ≠ изменение этапов заявки. Обязательные роли (комплаенс, менеджер, провайдер…) нельзя выключить."}
          </p>
          <p className="text-xs text-muted-foreground">Версия конфигурации: {version}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Приоритет</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Влияние</th>
                <th className="px-3 py-2">В процессе</th>
                <th className="px-3 py-2">Права</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.role} className="border-t border-border/60">
                  <td className="px-3 py-2 tabular-nums">{row.priority}</td>
                  <td className="px-3 py-2 font-medium">
                    {row.role}
                    {row.mandatory ? (
                      <span className="ml-2 text-xs text-muted-foreground">обязательная</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.influence}</td>
                  <td className="px-3 py-2">{row.enabled ? "да" : "нет"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.capabilities.join(", ")}</td>
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
                      <button
                        type="button"
                        disabled={busy || (row.mandatory && row.enabled)}
                        onClick={() => void toggleEnabled(row)}
                        className={cn("rounded px-2 py-1 text-xs hover:bg-muted", busy && "opacity-50")}
                      >
                        {row.enabled ? "Отключить" : "Включить"}
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
