import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/ved/AppShell";
import { KIND_LABEL } from "@/components/ved/DocumentViewer";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { dateTime } from "@/lib/ved/format";
import { useVed, visibleForms } from "@/lib/ved/store";
import type { AttachedDocument, PaymentForm } from "@/lib/ved/types";

type DocRow = { doc: AttachedDocument; form: PaymentForm };

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Все типы" },
  ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
];

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Документы — ВЭД от Вилетех" },
      { name: "description", content: "Все документы по сделкам: договоры, поручения, инвойсы, платёжные документы и отчёты с предпросмотром." },
      { property: "og:title", content: "Документы — ВЭД от Вилетех" },
      { property: "og:description", content: "Договоры, поручения, инвойсы и платёжные документы по всем заявкам." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { forms, session, addDocuments, deleteDocument } = useVed();
  const mine = visibleForms(forms, session?.role, session?.name);
  const canWrite = session?.role === "user" || session?.role === "manager" || session?.role === "root";

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState<DocRow | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [targetForm, setTargetForm] = useState("");
  const [uploadKind, setUploadKind] = useState<AttachedDocument["kind"]>("invoice");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const all: DocRow[] = mine.flatMap((form) => form.documents.map((doc) => ({ doc, form })));
    const q = query.trim().toLowerCase();
    return all
      .filter(({ doc, form }) => {
        if (kind && doc.kind !== kind) return false;
        if (!q) return true;
        return (
          doc.title.toLowerCase().includes(q) ||
          form.number.toLowerCase().includes(q) ||
          KIND_LABEL[doc.kind].toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.doc.uploadedAt.localeCompare(a.doc.uploadedAt));
  }, [mine, query, kind]);

  const startUpload = () => {
    setTargetForm(mine[0]?.id ?? "");
    setUploadKind("invoice");
    setFiles([]);
    setError("");
    setUploadOpen(true);
  };

  const submitUpload = () => {
    if (!targetForm) return setError("Выберите заявку");
    if (files.length === 0) return setError("Выберите файлы");
    addDocuments(
      targetForm,
      files.map((f) => ({ name: f.name, size: f.size })),
      uploadKind,
    );
    setUploadOpen(false);
  };

  return (
    <AppShell title="Документы" subtitle={`Договоры, поручения и отчёты по вашим сделкам · документов: ${rows.length}`}>
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или номеру заявки"
            className="field max-w-xs"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="field max-w-48">
            {KIND_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{rows.length} документов</span>
          {canWrite && (
            <button
              type="button"
              onClick={startUpload}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Загрузить документы
            </button>
          )}
        </div>


        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps py-2 pr-4 whitespace-nowrap">Документ</th>
                <th className="label-caps py-2 pr-4 whitespace-nowrap">Тип</th>
                <th className="label-caps py-2 pr-4 whitespace-nowrap">Заявка</th>
                <th className="label-caps py-2 pr-4 whitespace-nowrap">Размер</th>
                <th className="label-caps py-2 pr-4 whitespace-nowrap">Загружен</th>
                <th className="label-caps py-2 pr-4 text-right whitespace-nowrap">Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ doc, form }) => (
                <tr key={doc.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">{doc.ext}</span>
                      <span className="truncate">{doc.title}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{KIND_LABEL[doc.kind]}</td>
                  <td className="py-2 pr-4">
                    <Link
                      to="/forms/$id"
                      params={{ id: form.id }}
                      className="font-mono text-xs font-semibold text-accent hover:underline"
                    >
                      {form.number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{doc.size}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{dateTime(doc.uploadedAt)}</td>
                  <td className="py-2 pr-4 text-right">
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen({ doc, form })}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
                      >
                        Просмотр
                      </button>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => deleteDocument(form.id, doc.id)}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive-soft"
                        >
                          Удалить
                        </button>
                      )}
                    </span>
                  </td>

                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Документы не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open !== null}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open?.doc.title ?? ""}
        description={open ? `${KIND_LABEL[open.doc.kind]} · заявка ${open.form.number} · ${open.doc.ext} · ${open.doc.size}` : undefined}
        wide
        footer={<ModalButton variant="quiet" onClick={() => setOpen(null)}>Закрыть</ModalButton>}
      >
        <div className="grid h-72 place-items-center rounded-md bg-muted text-center">
          <div>
            <p className="font-mono text-3xl font-semibold text-muted-foreground">{open?.doc.ext}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Предпросмотр документа · загружен {open ? dateTime(open.doc.uploadedAt) : ""}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Загрузить документы"
        description="Выберите заявку, тип документа и один или несколько файлов."
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setUploadOpen(false)}>
              Отмена
            </ModalButton>
            <ModalButton onClick={submitUpload}>Загрузить</ModalButton>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div>
            <p className="label-caps">Заявка</p>
            <select value={targetForm} onChange={(e) => setTargetForm(e.target.value)} className="field mt-1">
              <option value="">Выберите заявку</option>
              {mine.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.number} · {f.invoiceNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="label-caps">Тип документа</p>
            <select
              value={uploadKind}
              onChange={(e) => setUploadKind(e.target.value as AttachedDocument["kind"])}
              className="field mt-1"
            >
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="label-caps">Файлы</p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.doc,.docx"
              onChange={(e) => {
                setFiles(Array.from(e.target.files ?? []));
                setError("");
              }}
              className="field mt-1 text-xs"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </div>
      </Modal>

    </AppShell>
  );
}
