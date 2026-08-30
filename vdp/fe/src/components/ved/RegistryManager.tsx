import { useMemo, useRef, useState } from "react";

import { Modal, ModalButton } from "@/components/ved/Modal";
import {
  emptyRecord,
  labelFor,
  parseRecords,
  templateCsv,
  toCsv,
  validate,
  type RefRecord,
  type RegistryDef,
} from "@/lib/ved/registry";
import { useVed } from "@/lib/ved/store";
import type { VedRole } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

type Extra = { label: string; value: (record: RefRecord) => string };

/** Универсальная таблица справочника: поиск, создание, редактирование, удаление и импорт. */
export function RegistryManager({
  def,
  extraColumns = [],
  badge,
  writeRoles = [],
}: {
  def: RegistryDef;
  extraColumns?: Extra[];
  badge?: (record: RefRecord) => { text: string; cls: string } | null;
  /** Роли, которым разрешено добавлять и редактировать записи (удаление и импорт — только суперадмину). */
  writeRoles?: VedRole[];
}) {
  const { session, refRecords, saveRefRecord, deleteRefRecord, importRefRecords } = useVed();
  const records = refRecords(def.key);
  const canManage = session?.role === "root";
  const canWrite = canManage || (session != null && writeRoles.includes(session.role));

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<RefRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<RefRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) =>
      def.fields.some((field) => String(record[field.key] ?? "").toLowerCase().includes(q)),
    );
  }, [records, query, def.fields]);

  function openCreate() {
    setDraft(emptyRecord(def));
    setEditingId(null);
    setFormError(null);
  }

  function openEdit(record: RefRecord) {
    setDraft({ ...record });
    setEditingId(String(record[def.idField]));
    setFormError(null);
  }

  function submit() {
    if (!draft) return;
    const invalid = validate(def, draft);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    saveRefRecord(def.key, draft, editingId ?? undefined);
    setNotice(editingId ? "Запись обновлена" : "Запись добавлена");
    setDraft(null);
    setEditingId(null);
  }

  function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function runImport() {
    const { records: parsed, error } = parseRecords(def, importText);
    if (error) {
      setImportError(error);
      return;
    }
    importRefRecords(def.key, parsed, importMode);
    setNotice(`Загружено записей: ${parsed.length}`);
    setImportOpen(false);
    setImportText("");
    setImportError(null);
  }

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по справочнику"
            className="field max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{rows.length} записей</span>
            <button
              type="button"
              onClick={() => download(toCsv(def, records), `${def.key}.csv`)}
              className="rounded-md bg-card px-3 py-2 text-xs font-semibold shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
            >
              Скачать CSV
            </button>
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setImportOpen(true);
                  setImportError(null);
                  if (!canManage) setImportMode("append");
                }}
                className="rounded-md bg-card px-3 py-2 text-xs font-semibold shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
              >
                Загрузить Excel / CSV
              </button>
            )}

            {canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Добавить
              </button>
            )}
          </div>
        </div>

        {notice && <p className="mt-2 text-xs text-done">{notice}</p>}
        {!canWrite && (
          <p className="mt-2 text-xs text-muted-foreground">
            Просмотр справочника. Изменения доступны роли «Суперадмин».
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {def.fields.map((field) => (
                  <th key={field.key} className="label-caps py-2 pr-4 whitespace-nowrap">
                    {field.label}
                  </th>
                ))}
                {extraColumns.map((col) => (
                  <th key={col.label} className="label-caps py-2 pr-4 text-right whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {canWrite && <th className="label-caps py-2 pr-4 text-right whitespace-nowrap">Управление</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => {
                const mark = badge?.(record) ?? null;
                return (
                  <tr key={String(record[def.idField])} className="border-b border-border/60">
                    {def.fields.map((field) => (
                      <td
                        key={field.key}
                        className={cn("py-2 pr-4", field.mono && "font-mono text-xs")}
                      >
                        {field.key === "status" && mark ? (
                          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", mark.cls)}>
                            {mark.text}
                          </span>
                        ) : (
                          labelFor(field, record[field.key])
                        )}
                      </td>
                    ))}
                    {extraColumns.map((col) => (
                      <td key={col.label} className="py-2 pr-4 text-right font-mono text-xs">
                        {col.value(record)}
                      </td>
                    ))}
                    {canWrite && (
                      <td className="py-2 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                        >
                          Изменить
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setRemoving(record)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive-soft"
                          >
                            Удалить
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={def.fields.length + extraColumns.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        title={editingId ? `Изменить ${def.singular}` : `Добавить ${def.singular}`}
        description="Данные сохраняются в справочник и сразу доступны в заявках."
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setDraft(null)}>
              Отмена
            </ModalButton>
            <ModalButton onClick={submit}>Сохранить</ModalButton>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            {def.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="label-caps">{field.label}</span>
                {field.type === "select" ? (
                  <select
                    value={String(draft[field.key] ?? "")}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                    className="field mt-1"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "boolean" ? (
                  <span className="mt-1 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(draft[field.key])}
                      onChange={(e) => setDraft({ ...draft, [field.key]: e.target.checked })}
                    />
                    Требуется
                  </span>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(draft[field.key] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="field mt-1"
                  />
                )}
              </label>
            ))}
            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Удалить запись?"
        description="Запись исчезнет из справочника. Действие нельзя отменить."
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setRemoving(null)}>
              Отмена
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={() => {
                if (removing) deleteRefRecord(def.key, String(removing[def.idField]));
                setNotice("Запись удалена");
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
        title="Загрузка данных в справочник"
        description="Загрузите файл CSV/TSV или вставьте таблицу из Excel. Первая строка — заголовки."
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-card px-3 py-2 text-xs font-semibold shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
            >
              Выбрать файл
            </button>
            <button
              type="button"
              onClick={() => download(templateCsv(def), `${def.key}-template.csv`)}
              className="rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Скачать шаблон
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError(null);
                try {
                  if (/\.xlsx?$/i.test(file.name)) {
                    const XLSX = await import("xlsx");
                    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
                    const first = book.SheetNames[0];
                    const sheet = first ? book.Sheets[first] : undefined;
                    if (!sheet) {
                      setImportError("В файле Excel нет данных");
                      return;
                    }
                    setImportText(XLSX.utils.sheet_to_csv(sheet, { FS: ";" }).trim());
                  } else {
                    setImportText(await file.text());
                  }
                } catch {
                  setImportError("Не удалось прочитать файл");
                }
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder={templateCsv(def)}
            className="field resize-none font-mono text-xs"
          />
          <div className="flex gap-4 text-xs">
            {(canManage ? (["append", "replace"] as const) : (["append"] as const)).map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input type="radio" checked={importMode === mode} onChange={() => setImportMode(mode)} />
                {mode === "append" ? "Добавить и обновить" : "Заменить справочник"}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Поддерживаются файлы .xlsx, .xls и .csv. Ожидаемые колонки: {def.fields.map((f) => f.label).join(", ")}
          </p>
          {importError && <p className="text-xs text-destructive">{importError}</p>}

        </div>
      </Modal>
    </div>
  );
}
