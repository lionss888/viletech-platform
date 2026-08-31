import { createFileRoute } from '@tanstack/react-router'
import { VedFormLink } from "@/components/ved/VedLink";
import { useMemo, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { KIND_LABEL } from "@/components/ved/DocumentViewer";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { dateTime } from "@/lib/ved/format";
import { usePlatformStore, visibleForms } from "@/lib/ved/platform-store";
import type { AttachedDocument, PaymentForm } from "@/lib/ved/types";

type DocRow = { doc: AttachedDocument; form: PaymentForm };

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Все типы" },
  ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
];

export const Route = createFileRoute("/demo/documents")({
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

export function DocumentsPage() {
  const { forms, session } = usePlatformStore();
  const mine = visibleForms(forms, session?.role, session?.name);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState<DocRow | null>(null);

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

  return (
    <VedAppShell title="Документы" subtitle={`Договоры, поручения и отчёты по вашим сделкам · документов: ${rows.length}`}>
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
                    <VedFormLink id={form.id} className="font-mono text-xs font-semibold text-accent hover:underline">
                      {form.number}
                    </VedFormLink>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{doc.size}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{dateTime(doc.uploadedAt)}</td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => setOpen({ doc, form })}
                      className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-border"
                    >
                      Просмотр
                    </button>
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
    </VedAppShell>
  );
}
