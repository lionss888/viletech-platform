import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { Modal, ModalButton } from "@/components/ved/Modal";
import {
  findCapabilityLabel,
  getProcessRoles,
  influenceLabel,
  updateProcessRole,
  type CapabilityCatalogEntry,
  type ProcessRoleInfluence,
  type ProcessRoleRow,
} from "@/lib/api/process-roles";
import { createAdminAccount, patchAdminAccount } from "@/lib/api/catalog-mutations";
import { dateOnly } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { parseRecords, templateCsv, toCsv, USER_IMPORT_FIELDS } from "@/lib/ved/registry";
import { roleTitle, ROLES } from "@/lib/ved/roles";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { useAuth } from "@/lib/auth/session";
import type { PlatformUser, VedRole } from "@/lib/ved/types";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/demo/admin")({
  head: () => ({
    meta: [
      { title: "Пользователи и роли — ⚡ ВЭД от Вилетех ₽" },
      { name: "description", content: "Управление пользователями платформы ВЭД: создание, редактирование, блокировка и удаление учётных записей." },
      { property: "og:title", content: "Пользователи и роли — ⚡ ВЭД от Вилетех ₽" },
      { property: "og:description", content: "Создание, редактирование, блокировка и удаление учётных записей." },
    ],
  }),
  component: AdminPage,
});

type Draft = {
  name: string;
  email: string;
  role: VedRole;
  organization: string;
  accountKind: "user" | "admin";
  businessOverrides: string[];
  useBusinessOverrides: boolean;
};

type RoleTemplateDraft = {
  enabled: boolean;
  mandatory: boolean;
  influence: ProcessRoleInfluence;
  capabilities: string[];
};

const EMPTY: Draft = {
  name: "",
  email: "",
  role: "user",
  organization: "",
  accountKind: "user",
  businessOverrides: [],
  useBusinessOverrides: false,
};

const USERS_CSV = { fields: USER_IMPORT_FIELDS };
const INFLUENCE_OPTIONS: ProcessRoleInfluence[] = ["actor", "observer", "none"];

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminPage() {
  const { users, organizations, toggleBlocked, deleteUser, importUsers, session, ready } = usePlatformStore();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const mode = usePlatformMode();
  const isApp = mode === "app";
  const role = session?.role ?? auth.role;
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<PlatformUser | null>(null);
  const [blocking, setBlocking] = useState<PlatformUser | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplateDraft | null>(null);
  const [roleTemplateDirty, setRoleTemplateDirty] = useState(false);
  const [catalog, setCatalog] = useState<CapabilityCatalogEntry[]>([]);
  const [allCaps, setAllCaps] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const modalOpen = creating || editing !== null;
  const processEligible = draft.accountKind === "user" && draft.role !== "root";

  useEffect(() => {
    if (!modalOpen || !isApp) {
      setRoleTemplate(null);
      setRoleTemplateDirty(false);
      return;
    }
    let cancelled = false;
    void getProcessRoles()
      .then((data) => {
        if (cancelled) return;
        setCatalog(data.capabilities_catalog ?? []);
        setAllCaps(data.capabilities ?? []);
        if (!processEligible) {
          setRoleTemplate(null);
          setRoleTemplateDirty(false);
          return;
        }
        const row = data.roles.find((r: ProcessRoleRow) => r.role === draft.role);
        if (row) {
          setRoleTemplate({
            enabled: row.enabled,
            mandatory: row.mandatory,
            influence: row.influence,
            capabilities: [...row.capabilities],
          });
        } else {
          setRoleTemplate(null);
        }
        setRoleTemplateDirty(false);
      })
      .catch((err: Error) => {
        if (!cancelled) setFormError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, isApp, processEligible, draft.role]);

  if (!ready && isApp) {
    return (
      <VedAppShell title="Пользователи и роли">
        <p className="text-sm text-muted-foreground">Загрузка учётных записей…</p>
      </VedAppShell>
    );
  }

  if (role !== "root") {
    return (
      <VedAppShell title="Доступ ограничен">
        <div className="panel p-6 text-sm text-muted-foreground">
          Раздел доступен только роли «Суперадмин».
          {isApp ? " Войдите как root@vdp.local." : " Переключите роль в сайдбаре."}
        </div>
      </VedAppShell>
    );
  }

  const valid = draft.name.trim().length > 1 && /.+@.+\..+/.test(draft.email);

  function openCreate() {
    setDraft(EMPTY);
    setFormError(null);
    setCreating(true);
  }

  function openEdit(user: PlatformUser) {
    setDraft({
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization ?? "",
      accountKind: user.role === "root" ? "admin" : "user",
      businessOverrides: [],
      useBusinessOverrides: false,
    });
    setFormError(null);
    setEditing(user);
  }

  async function submit() {
    if (!valid) return;
    const typedRole = draft.accountKind === "admin" ? ("root" as VedRole) : draft.role === "root" ? ("user" as VedRole) : draft.role;
    setSaving(true);
    setFormError(null);
    try {
      if (isApp) {
        if (editing) {
          const patch: Parameters<typeof patchAdminAccount>[1] = {
            email: draft.email.trim(),
            role: typedRole,
            account_kind: draft.accountKind,
            full_name: draft.name.trim(),
            clear_business_overrides: !draft.useBusinessOverrides,
          };
          if (draft.useBusinessOverrides) {
            patch.business_cap_overrides = draft.businessOverrides;
          }
          await patchAdminAccount(editing.id, patch);
        } else {
          const create: Parameters<typeof createAdminAccount>[0] = {
            email: draft.email.trim(),
            password: "ChangeMe2024!",
            role: typedRole,
            account_kind: draft.accountKind,
            full_name: draft.name.trim(),
          };
          if (draft.useBusinessOverrides) {
            create.business_cap_overrides = draft.businessOverrides;
          }
          await createAdminAccount(create);
          setNotice(`Создан ${draft.email.trim()} (${draft.accountKind}). Временный пароль: ChangeMe2024!`);
        }
        if (processEligible && roleTemplate && roleTemplateDirty) {
          try {
            await updateProcessRole(typedRole, {
              enabled: roleTemplate.enabled,
              mandatory: roleTemplate.mandatory,
              influence: roleTemplate.influence,
              capabilities: roleTemplate.capabilities,
            });
          } catch (err) {
            setFormError(
              `Аккаунт сохранён, но шаблон роли не обновлён: ${err instanceof Error ? err.message : "ошибка"}`,
            );
            await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
            setSaving(false);
            return;
          }
        }
        await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      } else {
        setNotice("В демо-режиме сохранение шаблона роли недоступно — используйте app.");
      }
      setEditing(null);
      setCreating(false);
      setDraft(EMPTY);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  function runImport() {
    const { records, error } = parseRecords(USERS_CSV, importText);
    if (error) {
      setImportError(error);
      return;
    }
    importUsers(records, importMode);
    setNotice(`Загружено пользователей: ${records.length}`);
    setImportOpen(false);
    setImportText("");
    setImportError(null);
  }

  function patchTemplate(patch: Partial<RoleTemplateDraft>) {
    setRoleTemplate((prev) => (prev ? { ...prev, ...patch } : prev));
    setRoleTemplateDirty(true);
  }

  const formFields = (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Аккаунт</h3>
        <label className="block">
          <span className="label-caps">Имя</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field mt-1" placeholder="И. Иванов" />
        </label>
        <label className="block">
          <span className="label-caps">Email</span>
          <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="field mt-1" placeholder="user@company.ru" />
        </label>
        <label className="block">
          <span className="label-caps">Тип аккаунта</span>
          <select
            value={draft.accountKind}
            onChange={(e) => {
              const accountKind = e.target.value as "user" | "admin";
              setDraft({
                ...draft,
                accountKind,
                role: accountKind === "admin" ? "root" : draft.role === "root" ? "user" : draft.role,
              });
            }}
            className="field mt-1 text-sm"
          >
            <option value="user">Пользователь (бизнес-роли)</option>
            <option value="admin">Администратор (суперадмин)</option>
          </select>
        </label>
        <label className="block">
          <span className="label-caps">Роль</span>
          <select
            value={draft.role}
            disabled={draft.accountKind === "admin"}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as VedRole })}
            className="field mt-1 text-sm"
          >
            {ROLES.filter((r) => (draft.accountKind === "admin" ? r.id === "root" : r.id !== "root")).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-caps">Организация</span>
          <select value={draft.organization} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} className="field mt-1 text-sm">
            <option value="">Без организации</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {processEligible && roleTemplate && isApp ? (
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Шаблон роли в процессе</h3>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Изменения шаблона действуют на всех пользователей с ролью «{roleTitle(draft.role)}».
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roleTemplate.enabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  patchTemplate(
                    enabled
                      ? { enabled: true }
                      : { enabled: false, mandatory: false },
                  );
                }}
              />
              В процессе
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roleTemplate.mandatory}
                onChange={(e) =>
                  patchTemplate({
                    mandatory: e.target.checked,
                    enabled: e.target.checked ? true : roleTemplate.enabled,
                  })
                }
              />
              Обязательная
            </label>
            <label className="block text-sm">
              <span className="label-caps">Влияние</span>
              <select
                className="field mt-1 text-xs"
                value={roleTemplate.influence}
                onChange={(e) => patchTemplate({ influence: e.target.value as ProcessRoleInfluence })}
              >
                {INFLUENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {influenceLabel(opt)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2">
            {(catalog.length > 0 ? catalog.map((c) => c.id) : allCaps).map((id) => {
              const label = findCapabilityLabel(catalog, id);
              const checked = roleTemplate.capabilities.includes(id);
              return (
                <label key={id} className="flex cursor-pointer items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? roleTemplate.capabilities.filter((c) => c !== id)
                        : [...roleTemplate.capabilities, id];
                      patchTemplate({ capabilities: next });
                    }}
                  />
                  <span>
                    <span className="font-medium">{label.title}</span>
                    {label.description ? <span className="block text-muted-foreground">{label.description}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {isApp ? (
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Override на аккаунте</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.useBusinessOverrides}
              onChange={(e) => setDraft({ ...draft, useBusinessOverrides: e.target.checked })}
            />
            Задать персональные business-права (иначе шаблон роли)
          </label>
          {draft.useBusinessOverrides ? (
            <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-border p-2">
              {(catalog.length > 0 ? catalog.map((c) => c.id) : allCaps).map((id) => {
                const label = findCapabilityLabel(catalog, id);
                const checked = draft.businessOverrides.includes(id);
                return (
                  <label key={id} className="flex cursor-pointer items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? draft.businessOverrides.filter((c) => c !== id)
                          : [...draft.businessOverrides, id];
                        setDraft({ ...draft, businessOverrides: next });
                      }}
                    />
                    <span className="font-medium">{label.title}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
          {draft.accountKind === "admin" ? (
            <p className="text-xs text-muted-foreground">Системные права root locked (accounts / process_roles / system.admin) нельзя снять.</p>
          ) : null}
        </section>
      ) : null}

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
    </div>
  );

  return (
    <VedAppShell title="Пользователи и роли" subtitle={`Всего аккаунтов: ${users.length}`}>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {ROLES.map((role) => (
          <div key={role.id} className="panel p-3">
            <p className="label-caps">{role.title}</p>
            <p className="mt-1 font-mono text-xl font-semibold">{users.filter((u) => u.role === role.id).length}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Учётные записи</h2>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <ModalButton
              variant="quiet"
              className="w-full sm:w-auto"
              onClick={() =>
                download(
                  toCsv(USERS_CSV, users.map((u) => ({ name: u.name, email: u.email, role: roleTitle(u.role), organization: u.organization ?? "" }))),
                  "users.csv",
                )
              }
            >
              Скачать CSV
            </ModalButton>
            <ModalButton
              variant="quiet"
              disabled={isApp}
              onClick={() => {
                setImportOpen(true);
                setImportError(null);
              }}
            >
              Загрузить пользователей
            </ModalButton>
            <ModalButton className="w-full sm:w-auto" onClick={openCreate}>
              Создать пользователя
            </ModalButton>
          </div>
        </div>
        {notice && <p className="mt-2 text-xs text-done">{notice}</p>}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps py-2 pr-4">Пользователь</th>
                <th className="label-caps py-2 pr-4">Email</th>
                <th className="label-caps py-2 pr-4">Тип</th>
                <th className="label-caps py-2 pr-4">Роль</th>
                <th className="label-caps py-2 pr-4">Организация</th>
                <th className="label-caps py-2 pr-4">Создан</th>
                <th className="label-caps py-2 pr-4 text-right whitespace-nowrap">Управление</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{u.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                  <td className="py-2 pr-4 text-xs">{u.role === "root" ? "admin" : "user"}</td>
                  <td className="py-2 pr-4 text-xs">{roleTitle(u.role)}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{u.organization ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono text-[11px] text-muted-foreground">{dateOnly(u.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-[11px] font-semibold",
                          u.blocked ? "bg-return-soft text-return" : "bg-done-soft text-done",
                        )}
                      >
                        {u.blocked ? "Заблокирован" : "Активен"}
                      </span>
                      <button type="button" onClick={() => openEdit(u)} className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border">
                        Изменить
                      </button>
                      <button type="button" onClick={() => setBlocking(u)} className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border">
                        {u.blocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                      <button
                        type="button"
                        disabled={isApp}
                        title={isApp ? "Удаление через API не поддерживается — используйте блокировку" : undefined}
                        onClick={() => setRemoving(u)}
                        className="rounded-md bg-destructive-soft px-2 py-1 text-[11px] font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Удалить
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
        open={creating || editing !== null}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editing ? "Редактирование пользователя" : "Новый пользователь"}
        description={editing ? editing.email : "Учётная запись получит доступ согласно выбранной роли."}
        footer={
          <>
            <ModalButton
              variant="quiet"
              className="w-full sm:w-auto"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Отмена
            </ModalButton>
            <ModalButton onClick={() => void submit()} disabled={!valid || saving}>
              {editing ? "Сохранить" : "Создать"}
            </ModalButton>
          </>
        }
      >
        {formFields}
      </Modal>

      <Modal
        open={blocking !== null}
        onOpenChange={(v) => !v && setBlocking(null)}
        title={blocking?.blocked ? "Разблокировать доступ?" : "Заблокировать доступ?"}
        description={blocking ? `${blocking.name} · ${blocking.email}` : undefined}
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setBlocking(null)}>
              Отмена
            </ModalButton>
            <ModalButton
              variant={blocking?.blocked ? "primary" : "danger"}
              onClick={() => {
                if (blocking) toggleBlocked(blocking.id);
                setBlocking(null);
              }}
            >
              Подтвердить
            </ModalButton>
          </>
        }
      />

      <Modal
        open={removing !== null}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Удалить пользователя?"
        description={removing ? `${removing.name} · ${removing.email}. Действие необратимо.` : undefined}
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setRemoving(null)}>
              Отмена
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={() => {
                if (removing) deleteUser(removing.id);
                setRemoving(null);
              }}
            >
              Удалить
            </ModalButton>
          </>
        }
      />

      <Modal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Загрузить пользователей"
        description="CSV: name, email, role, organization"
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setImportOpen(false)}>
              Отмена
            </ModalButton>
            <ModalButton onClick={runImport}>Импорт</ModalButton>
          </>
        }
      >
        <div className="space-y-3">
          <textarea className="field min-h-32 font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <div className="flex gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="radio" checked={importMode === "append"} onChange={() => setImportMode("append")} />
              Дописать
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />
              Заменить
            </label>
            <button type="button" className="text-primary underline" onClick={() => setImportText(templateCsv(USERS_CSV))}>
              Шаблон
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then(setImportText);
            }} />
            <button type="button" className="text-primary underline" onClick={() => fileRef.current?.click()}>
              Файл
            </button>
          </div>
          {importError && <p className="text-xs text-destructive">{importError}</p>}
        </div>
      </Modal>
    </VedAppShell>
  );
}
