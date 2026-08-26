import { useState } from "react";

import { Modal, ModalButton } from "@/components/ved/Modal";
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

/** Просмотр вложения — доступен всем ролям. */
export function DocumentList({ documents }: { documents: AttachedDocument[] }) {
  const [open, setOpen] = useState<AttachedDocument | null>(null);

  return (
    <>
      <ul className="mt-3 divide-y divide-border">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">{d.ext}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{d.size}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">{dateTime(d.uploadedAt)}</span>
            <button
              type="button"
              onClick={() => setOpen(d)}
              className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
            >
              Просмотр
            </button>
          </li>
        ))}
        {documents.length === 0 && <li className="py-3 text-sm text-muted-foreground">Документов пока нет</li>}
      </ul>

      <Modal
        open={open !== null}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open?.title ?? ""}
        description={open ? `${KIND_LABEL[open.kind]} · ${open.ext} · ${open.size}` : undefined}
        wide
        footer={<ModalButton variant="quiet" onClick={() => setOpen(null)}>Закрыть</ModalButton>}
      >
        <div className="grid h-72 place-items-center rounded-md bg-muted text-center">
          <div>
            <p className="font-mono text-3xl font-semibold text-muted-foreground">{open?.ext}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Предпросмотр документа · загружен {open ? dateTime(open.uploadedAt) : ""}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
