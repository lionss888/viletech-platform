import { useEffect, useState } from "react";

import { downloadPrivateFile, fetchPrivateFileBlob } from "@/lib/api/docs";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { dateTime } from "@/lib/ved/format";
import type { AttachedDocument } from "@/lib/ved/types";

export const KIND_LABEL: Record<AttachedDocument["kind"], string> = {
  invoice: "Инвойс",
  contract: "Агентский договор",
  order: "Поручение принципала",
  payment: "Платёжный документ",
  report: "Отчёт агента",
  shipment: "Документы об отгрузке",
  other: "Документ",
};

type DocumentListProps = {
  documents: AttachedDocument[];
  formId?: string;
};

/** Document list with preview/download in app mode when fileId is present. */
export function DocumentList({ documents, formId: _formId }: DocumentListProps) {
  const mode = usePlatformMode();
  const [open, setOpen] = useState<AttachedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleDownload(doc: AttachedDocument) {
    if (!doc.fileId || mode !== "app") return;
    setBusy(true);
    setError(null);
    try {
      await downloadPrivateFile(doc.fileId, doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
    }
  }

  async function handleView(doc: AttachedDocument) {
    if (!doc.fileId || mode !== "app") {
      setOpen(doc);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const { objectUrl } = await fetchPrivateFileBlob(doc.fileId);
      setPreviewUrl(objectUrl);
      setOpen(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка просмотра");
    } finally {
      setBusy(false);
    }
  }

  function closePreview() {
    setOpen(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  return (
    <>
      {error && <p className="mb-2 rounded-md bg-destructive-soft px-2 py-1 text-xs text-destructive">{error}</p>}
      <ul className="mt-3 divide-y divide-border">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">{d.ext}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{d.size}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">{dateTime(d.uploadedAt)}</span>
            {mode === "app" && d.fileId ? (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleView(d)}
                  className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
                >
                  Посмотреть
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDownload(d)}
                  className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground hover:opacity-90"
                >
                  Скачать
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(d)}
                className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
              >
                Просмотр
              </button>
            )}
          </li>
        ))}
        {documents.length === 0 && <li className="py-3 text-sm text-muted-foreground">Документов пока нет</li>}
      </ul>

      <Modal
        open={open !== null}
        onOpenChange={(v) => !v && closePreview()}
        title={open?.title ?? ""}
        description={open ? `${KIND_LABEL[open.kind]} · ${open.ext} · ${open.size}` : undefined}
        wide
        footer={<ModalButton variant="quiet" onClick={closePreview}>Закрыть</ModalButton>}
      >
        {previewUrl && open?.ext.toLowerCase() === "pdf" ? (
          <iframe title={open.title} src={previewUrl} className="h-[70vh] w-full rounded-md bg-muted" />
        ) : (
          <div className="grid h-72 place-items-center rounded-md bg-muted text-center">
            <div>
              <p className="font-mono text-3xl font-semibold text-muted-foreground">{open?.ext}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {mode === "demo" ? "Demo: предпросмотр без файла" : previewUrl ? "Предпросмотр" : "Файл открыт — скачайте при необходимости"} ·{" "}
                {open ? dateTime(open.uploadedAt) : ""}
              </p>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent underline">
                  Открыть в новой вкладке
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
