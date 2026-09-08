import { createFileRoute } from "@tanstack/react-router";
import { VedFormLink } from "@/components/ved/VedLink";
import { useEffect, useMemo, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { KIND_LABEL } from "@/components/ved/DocumentViewer";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { downloadPrivateFile, fetchPrivateFileBlob } from "@/lib/api/docs";
import { dateTime } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore, visibleForms } from "@/lib/ved/platform-store";
import type { AttachedDocument, PaymentForm } from "@/lib/ved/types";

type DocRow = { doc: AttachedDocument; form: PaymentForm };

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Все типы" },
  ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
];

function isPdfDocument(doc: AttachedDocument): boolean {
  const ext = doc.ext?.toLowerCase() ?? "";
  const title = doc.title?.toLowerCase() ?? "";
  return ext === "pdf" || title.endsWith(".pdf");
}

export const Route = createFileRoute("/demo/documents")({
  head: () => ({
    meta: [
      { title: "Документы — ⚡ Веди ВЭД ₽" },
      {
        name: "description",
        content:
          "Все документы по сделкам: договоры, поручения, инвойсы, платёжные документы и отчёты с предпросмотром.",
      },
      { property: "og:title", content: "Документы — ⚡ Веди ВЭД ₽" },
      {
        property: "og:description",
        content: "Договоры, поручения, инвойсы и платёжные документы по всем заявкам.",
      },
    ],
  }),
  component: DocumentsPage,
});

export function DocumentsPage() {
  const { forms, session, addDocuments, deleteDocument } = usePlatformStore();
  const mode = usePlatformMode();
  const mine = visibleForms(forms, session?.role, session?.name);
  const canWrite = session?.role === "user" || session?.role === "manager" || session?.role === "root";
  const canDelete = canWrite;

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState<DocRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [targetForm, setTargetForm] = useState("");
  const [uploadKind, setUploadKind] = useState<AttachedDocument["kind"]>("invoice");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const submitUpload = async () => {
    if (!targetForm) return setError("Выберите заявку");
    if (files.length === 0) return setError("Выберите файлы");
    try {
      await addDocuments(targetForm, files, uploadKind);
      setUploadOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить документы");
    }
  };

  const removeDocument = async (formId: string, docId: string) => {
    try {
      await deleteDocument(formId, docId);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить документ");
    }
  };

  async function openPreview(row: DocRow) {
    setError("");
    if (mode === "app" && row.doc.fileId) {
      setPreviewBusy(true);
      try {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const { objectUrl } = await fetchPrivateFileBlob(row.doc.fileId);
        setPreviewUrl(objectUrl);
        setOpen(row);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось открыть файл");
      } finally {
        setPreviewBusy(false);
      }
      return;
    }
    setPreviewUrl(null);
    setOpen(row);
  }

  function closePreview() {
    setOpen(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  return (
    <VedAppShell
      title="Документы"
      subtitle={`Договоры, поручения и отчёты по вашим сделкам · документов: ${rows.length}`}
    >
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
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:w-auto"
            >
              Загрузить документы
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}

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
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                        {doc.ext}
                      </span>
                      <span className="truncate">{doc.title}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{KIND_LABEL[doc.kind]}</td>
                  <td className="py-2 pr-4">
                    <VedFormLink
                      id={form.id}
                      className="font-mono text-xs font-semibold text-accent hover:underline"
                    >
                      {form.number}
                    </VedFormLink>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{doc.size}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {dateTime(doc.uploadedAt)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={previewBusy}
                        onClick={() => void openPreview({ doc, form })}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
                      >
                        Просмотр
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          data-testid="registry-doc-delete"
                          onClick={() => void removeDocument(form.id, doc.id)}
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
        onOpenChange={(v) => !v && closePreview()}
        title={open?.doc.title ?? ""}
        description={open ? `${KIND_LABEL[open.doc.kind]} · заявка ${open.form.number}` : undefined}
        wide
        footer={
          <>
            {mode === "app" && open?.doc.fileId ? (
              <ModalButton
                variant="quiet"
                onClick={() => {
                  if (open?.doc.fileId) {
                    void downloadPrivateFile(
                      open.doc.fileId,
                      open.doc.title.endsWith(".pdf") ? open.doc.title : `${open.doc.title}.pdf`,
                    );
                  }
                }}
              >
                Скачать
              </ModalButton>
            ) : null}
            <ModalButton variant="quiet" onClick={closePreview}>
              Закрыть
            </ModalButton>
          </>
        }
      >
        {previewUrl && open && isPdfDocument(open.doc) ? (
          <iframe
            title={open.doc.title}
            src={previewUrl}
            className="h-[70vh] w-full rounded-md border border-border"
          />
        ) : previewUrl && open ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Предпросмотр для этого типа открывается скачиванием.</p>
            <a href={previewUrl} download={open.doc.title} className="font-semibold text-accent hover:underline">
              Скачать файл
            </a>
          </div>
        ) : (
          <div className="grid h-72 place-items-center rounded-md bg-muted text-center">
            <div>
              <p className="font-mono text-3xl font-semibold text-muted-foreground">{open?.doc.ext}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {mode === "app" && !open?.doc.fileId
                  ? "Нет file id — предпросмотр недоступен"
                  : `Загружен ${open ? dateTime(open.doc.uploadedAt) : ""}`}
              </p>
            </div>
          </div>
        )}
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
            <ModalButton onClick={() => void submitUpload()}>Загрузить</ModalButton>
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
    </VedAppShell>
  );
}
