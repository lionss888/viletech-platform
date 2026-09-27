import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ManagerRouteHintPanel } from "@/components/ved/ManagerRouteHintPanel";
import { Modal, ModalButton } from "@/components/ved/Modal";
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
import { invalidateProcessRolesSnapshot } from "@/lib/ved/use-process-roles-snapshot";
import { cn } from "@/lib/utils";

const INFLUENCE_OPTIONS: ProcessRoleInfluence[] = ["actor", "observer", "none"];

type TreasurerDisableDraft = {
  mode: "skip" | "handoff";
  handoffRole: string;
};

export function ProcessRolesPage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const queryClient = useQueryClient();
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
  const [treasurerDisable, setTreasurerDisable] = useState<TreasurerDisableDraft | null>(null);

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

  async function afterSave() {
    await reload();
    await invalidateProcessRolesSnapshot(queryClient);
  }

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
    const current = order[index];
    const target = order[next];
    if (!current || !target) return;
    order[index] = target;
    order[next] = current;
    setBusy(true);
    setError(null);
    try {
      await updateProcessRolePriorities(order);
      await afterSave();
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
      await afterSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(row: ProcessRoleRow) {
    const nextEnabled = !row.enabled;
    if (nextEnabled) {
      await patchRole(row.role, { enabled: true, disable_mode: "", handoff_role: "" });
      return;
    }
    if (row.role === "treasurer") {
      setTreasurerDisable({ mode: "skip", handoffRole: "manager" });
      return;
    }
    // Leaving the process clears mandatory so the toggle is never deadlocked.
    await patchRole(row.role, { enabled: false, mandatory: false });
  }

  async function confirmTreasurerDisable() {
    if (!treasurerDisable) return;
    const handoff =
      treasurerDisable.mode === "skip" ? "manager" : treasurerDisable.handoffRole.trim();
    if (treasurerDisable.mode === "handoff" && !handoff) {
      setError("Выберите роль для перекладывания шагов казначея");
      return;
    }
    await patchRole("treasurer", {
      enabled: false,
      mandatory: false,
      disable_mode: treasurerDisable.mode,
      handoff_role: handoff,
    });
    setTreasurerDisable(null);
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
    let caps = row.capabilities ?? [];
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
    const current = row.capabilities ?? [];
    const has = current.includes(capId);
    const next = has ? current.filter((c) => c !== capId) : [...current, capId];
    await patchRole(row.role, { capabilities: next });
  }

  return (
    <VedAppShell title="Роли процесса">
      <div className="space-y-4">
        <ManagerRouteHintPanel role="root" />
        <div className="panel space-y-2 p-4 text-sm">
          <p className="font-semibold text-foreground">Участие ролей в фиксированном процессе</p>
          <p className="text-muted-foreground">
            {note ||
              "Порядок ролей ≠ этапы заявки. Суперадмин вне бизнес-процесса. Влияние, участие и «обязательная» правятся по месту; изменения шаблона роли глобальны."}
          </p>
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-foreground">
            <span className="font-semibold">Эффект «В процессе: нет»:</span> этапы заявки (организация / форма) остаются.
            Слот проверки ICO или ECO закрывает менеджер с правом <span className="font-mono">manager.ops</span> — в
            кабинете появятся CTA «Взять в проверку» и подсказки «следующий шаг» у менеджера. Включение роли возвращает
            CTA соответствующей роли комплаенса.
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
                      {(row.capabilities ?? []).map((id) => {
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
                          const checked = (row.capabilities ?? []).includes(id);
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

      <Modal
        open={treasurerDisable !== null}
        onOpenChange={(open) => {
          if (!open) setTreasurerDisable(null);
        }}
        title="Выключить казначея"
        description="Шаги казначея остаются в статусной машине. Укажите, кто их исполняет, или пропуск — менеджер."
        footer={
          <>
            <ModalButton variant="quiet" className="w-full sm:w-auto" onClick={() => setTreasurerDisable(null)}>
              Отмена
            </ModalButton>
            <ModalButton className="w-full sm:w-auto" disabled={busy} onClick={() => void confirmTreasurerDisable()}>
              Выключить
            </ModalButton>
          </>
        }
      >
        {treasurerDisable ? (
          <div className="space-y-3 text-sm" data-testid="treasurer-disable-dialog">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="treasurer-disable-mode"
                checked={treasurerDisable.mode === "skip"}
                onChange={() => setTreasurerDisable({ mode: "skip", handoffRole: "manager" })}
              />
              <span>
                <span className="font-medium">Пропустить роль</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Менеджер подтверждает поступление и связанные шаги казначея.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="treasurer-disable-mode"
                checked={treasurerDisable.mode === "handoff"}
                onChange={() =>
                  setTreasurerDisable({
                    mode: "handoff",
                    handoffRole: rows.find((r) => r.role === "manager" && r.enabled)?.role ?? "manager",
                  })
                }
              />
              <span className="font-medium">Переложить на роль</span>
            </label>
            {treasurerDisable.mode === "handoff" ? (
              <select
                className="field w-full text-sm"
                value={treasurerDisable.handoffRole}
                onChange={(e) =>
                  setTreasurerDisable((prev) => (prev ? { ...prev, handoffRole: e.target.value } : prev))
                }
              >
                {rows
                  .filter((r) => r.role !== "treasurer" && r.enabled && r.influence === "actor")
                  .map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </VedAppShell>
  );
}
