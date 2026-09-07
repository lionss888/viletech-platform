import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { confirmExtraction } from "@/lib/api/forms";
import {
  type ExtractionLineItem,
  type ExtractionResult,
  isLowConfidence,
  parseExtractionResult,
} from "@/lib/ved/extraction";
import { cn } from "@/lib/utils";

type Props = {
  formId: string;
  invoiceJson?: string;
  role: string;
  /** When false, fields stay read-only (e.g. waiting on another actor). */
  canConfirm?: boolean;
};

export function ExtractionReviewPanel({ formId, invoiceJson, role, canConfirm = true }: Props) {
  const qc = useQueryClient();
  const parsed = parseExtractionResult(invoiceJson);
  const [draft, setDraft] = useState<ExtractionResult | null>(parsed);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  useEffect(() => {
    setDraft(parseExtractionResult(invoiceJson));
  }, [invoiceJson]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("no extraction");
      return confirmExtraction(formId, { ...draft, meta: { ...draft.meta, confirmed: true } });
    },
    onSuccess: (form) => {
      const amount = form.invoice_amount ?? draft?.header.invoice_amount ?? "";
      const currency = form.currency ?? draft?.header.currency ?? "";
      setSavedNote(
        `Сохранено в параметры заявки: сумма ${amount || "—"} ${currency || ""}`.trim(),
      );
      void qc.invalidateQueries({ queryKey: ["form", formId] });
      void qc.invalidateQueries({ queryKey: ["forms"] });
      requestAnimationFrame(() => {
        document.getElementById("form-params")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("form-params")?.classList.add("ring-2", "ring-accent");
        window.setTimeout(() => {
          document.getElementById("form-params")?.classList.remove("ring-2", "ring-accent");
        }, 2500);
      });
    },
  });

  if (role === "provider") return null;
  if (!draft) {
    return (
      <section className="panel space-y-2 p-4" data-testid="extraction-empty">
        <h2 className="text-sm font-semibold text-foreground">Распознавание</h2>
        <p className="text-sm text-muted-foreground">
          Данные ещё не распознаны или распознавание недоступно. Заполните поля вручную.
        </p>
      </section>
    );
  }

  const confirmed = Boolean(draft.meta.confirmed);
  const editable = canConfirm && !confirmed;
  const updateHeader = (key: keyof ExtractionResult["header"], value: string) => {
    setDraft({ ...draft, header: { ...draft.header, [key]: value } });
  };
  const updateLine = (idx: number, patch: Partial<ExtractionLineItem>) => {
    const lines = draft.line_items.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    setDraft({ ...draft, line_items: lines });
  };

  return (
    <section className="panel space-y-3 p-4" data-testid="extraction-review">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Распознанные данные</h2>
        <p className="text-xs text-muted-foreground">
          {draft.meta.engine_id ?? "engine"} · проверьте позиции перед подтверждением
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Подтверждение переносит сумму, валюту и номера договора/инвойса в параметры заявки и сохраняет эталон
        для обучения. Это не отправка заявки на проверку — статус заявки не меняется.
      </p>
      {!canConfirm && !confirmed ? (
        <p className="text-xs text-muted-foreground">
          Сейчас подтверждение недоступно для вашей роли или статуса — дождитесь своего шага или правьте
          параметры после возврата.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Сумма
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.invoice_amount ?? ""}
            onChange={(e) => updateHeader("invoice_amount", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Валюта
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.currency ?? ""}
            onChange={(e) => updateHeader("currency", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Номер договора
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.contract_number ?? ""}
            onChange={(e) => updateHeader("contract_number", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Номер инвойса
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.invoice_number ?? ""}
            onChange={(e) => updateHeader("invoice_number", e.target.value)}
            disabled={!editable}
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Наименование</th>
              <th className="py-1 pr-2">Кол-во</th>
              <th className="py-1 pr-2">Сумма</th>
              <th className="py-1">ТН ВЭД</th>
            </tr>
          </thead>
          <tbody>
            {draft.line_items.map((row, idx) => (
              <tr
                key={idx}
                className={cn("border-b border-border/60", isLowConfidence(row) && "bg-amber-500/10")}
              >
                <td className="py-1 pr-2">{row.line_no ?? idx + 1}</td>
                <td className="py-1 pr-2">
                  <input
                    className="w-full rounded border border-border bg-background px-1 py-0.5"
                    value={row.description ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className="w-20 rounded border border-border bg-background px-1 py-0.5"
                    value={row.qty ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { qty: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className="w-24 rounded border border-border bg-background px-1 py-0.5"
                    value={row.line_amount ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { line_amount: e.target.value })}
                  />
                </td>
                <td className="py-1">
                  <input
                    className="w-24 rounded border border-border bg-background px-1 py-0.5"
                    value={row.hs_code ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { hs_code: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!confirmed && canConfirm ? (
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Сохранение…" : "Подтвердить распознавание"}
        </button>
      ) : confirmed ? (
        <p className="text-xs text-muted-foreground">Распознавание подтверждено — данные в gold для обучения.</p>
      ) : null}
      {savedNote ? (
        <p className="text-xs font-medium text-accent" data-testid="extraction-saved">
          {savedNote}
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="text-xs text-destructive">Не удалось сохранить. Повторите или заполните вручную.</p>
      ) : null}
    </section>
  );
}
