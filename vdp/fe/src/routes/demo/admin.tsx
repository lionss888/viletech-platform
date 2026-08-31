import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { dateOnly } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { parseRecords, templateCsv, toCsv, USER_IMPORT_FIELDS } from "@/lib/ved/registry";
import { roleTitle, ROLES } from "@/lib/ved/roles";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { useAuth } from "@/lib/auth/session";
import type { PlatformUser, VedRole } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/admin")({
  head: () => ({
    meta: [
      { title: "Пользователи и роли — ВЭД от Вилетех" },
      { name: "description", content: "Управление пользователями платформы ВЭД: создание, редактирование, блокировка и удаление учётных записей." },
      { property: "og:title", content: "Пользователи и роли — ВЭД от Вилетех" },
      { property: "og:description", content: "Создание, редактирование, блокировка и удаление учётных записей." },
    ],
  }),
  component: AdminPage,
});

type Draft = { name: string; email: string; role: VedRole; organization: string };

const EMPTY: Draft = { name: "", email: "", role: "user", organization: "" };

const USERS_CSV = { fields: USER_IMPORT_FIELDS };

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminPage() {
  const { users, organizations, toggleBlocked, createUser, updateUser, deleteUser, importUsers, session, ready } =
    usePlatformStore();
  const auth = useAuth();
  const mode = usePlatformMode();
  const isApp = mode === "app";
  const role = session?.role ?? auth.role;
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<PlatformUser | null>(null);
  const [blocking, setBlocking] = useState<PlatformUser | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    setCreating(true);
  }

  function openEdit(user: PlatformUser) {
    setDraft({ name: user.name, email: user.email, role: user.role, organization: user.organization ?? "" });
    setEditing(user);
  }

  function submit() {
    const payload = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      organization: draft.organization || undefined,
    };
    if (editing) {
      void updateUser(editing.id, payload);
    } else {
      void createUser(payload);
      if (isApp) {
        setNotice(`Создан ${payload.email}. Временный пароль: ChangeMe2024!`);
      }
    }
    setEditing(null);
    setCreating(false);
    setDraft(EMPTY);
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

  const formFields = (
    <div className="space-y-3">
      <label className="block">
        <span className="label-caps">Имя</span>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field mt-1" placeholder="И. Иванов" />
      </label>
      <label className="block">
        <span className="label-caps">Email</span>
        <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="field mt-1" placeholder="user@company.ru" />
      </label>
      <label className="block">
        <span className="label-caps">Роль</span>
        <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as VedRole })} className="field mt-1 text-sm">
          {ROLES.map((r) => (
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
              title={isApp ? "Импорт доступен только в демо-контуре" : undefined}
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
            <ModalButton onClick={submit} disabled={!valid}>
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
        wide
        title="Загрузка пользователей"
        description="Загрузите файл CSV/TSV или вставьте таблицу из Excel. Первая строка — заголовки. Совпадение по email обновляет существующую запись."
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setImportOpen(false)}>
              Отмена
            </ModalButton>
            <ModalButton onClick={runImport} disabled={importText.trim().length === 0}>
              Загрузить
            </ModalButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModalButton variant="quiet" onClick={() => fileRef.current?.click()}>
              Выбрать файл
            </ModalButton>
            <ModalButton variant="quiet" onClick={() => download(templateCsv(USERS_CSV), "users-template.csv")}>
              Скачать шаблон
            </ModalButton>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportText(await file.text());
                setImportError(null);
              }}
            />
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder={templateCsv(USERS_CSV)}
            className="field resize-none font-mono text-xs"
          />
          <div className="flex gap-4 text-xs">
            {(["append", "replace"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input type="radio" checked={importMode === mode} onChange={() => setImportMode(mode)} />
                {mode === "append" ? "Добавить и обновить" : "Заменить список"}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ожидаемые колонки: {USER_IMPORT_FIELDS.map((f) => f.label).join(", ")}. Роль указывается названием (например «Менеджер»).
          </p>
          {importError && <p className="text-xs text-destructive">{importError}</p>}
        </div>
      </Modal>
    </VedAppShell>
  );
}
