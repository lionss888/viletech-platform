import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { cancelExtraction, confirmExtraction, startExtraction } from "@/lib/api/forms";
import {
  type ExtractionLineItem,
  type ExtractionResult,
  canControlExtraction,
  extractionAmountWarnings,
  extractionPanelMode,
  isLowConfidence,
  orderExtractionWarnings,
  parseExtractionResult,
} from "@/lib/ved/extraction";
import { cn } from "@/lib/utils";

function fieldMark(current: string, origin: string | undefined): string {
  return current.trim() === (origin ?? "").trim() ? "распознано" : "изменено";
}

function CatalogPick({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const known = options.some((option) => option.value === value);
  return (
    <span className="mt-1 block min-w-0">
      {!known && value ? (
        <span className="mb-1 block text-[11px] text-amber-700">
          Распознано «{value}» — нет в справочнике. Выберите ближайшее значение, код не сбрасывается сам.
        </span>
      ) : null}
      <select
        className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        value={known ? value : ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{known ? "Не выбрано" : "Выберите из справочника"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

export type ExtractionReviewPanelProps = {
  formId: string;
  invoiceJson?: string;
  role: string;
  status?: string;
  noDocuments?: boolean;
  hasDocuments?: boolean;
  canConfirm?: boolean;
  /** Omit panel chrome when rendered inside a dialog/sheet. */
  embedded?: boolean;
  /** Called after successful confirm (e.g. close dialog). */
  onConfirmed?: () => void;
  currencyOptions?: { value: string; label: string }[];
  hsOptions?: { value: string; label: string }[];
  formAmountMinor?: number;
  formCurrency?: string;
  documentKind?: string;
};

/**
 * OCR extraction review: start/cancel/confirm and editable header/line items.
 * Use `embedded` inside Modal/Sheet; default is a card panel on the form page.
 */
export function ExtractionReviewPanel({
  formId,
  invoiceJson,
  role,
  status,
  noDocuments = false,
  hasDocuments = false,
  canConfirm = true,
  embedded = false,
  onConfirmed,
  currencyOptions = [],
  hsOptions = [],
  formAmountMinor,
  formCurrency,
  documentKind,
}: ExtractionReviewPanelProps) {
  const qc = useQueryClient();
  const parsed = parseExtractionResult(invoiceJson);
  const [draft, setDraft] = useState<ExtractionResult | null>(parsed);
  const [origin, setOrigin] = useState<ExtractionResult | null>(parsed);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  useEffect(() => {
    const next = parseExtractionResult(invoiceJson);
    setDraft(next);
    setOrigin(next);
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
      onConfirmed?.();
      requestAnimationFrame(() => {
        document.getElementById("form-params")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("form-params")?.classList.add("ring-2", "ring-accent");
        window.setTimeout(() => {
          document.getElementById("form-params")?.classList.remove("ring-2", "ring-accent");
        }, 2500);
      });
    },
  });

  const startMut = useMutation({
    mutationFn: () => startExtraction(formId),
    onSuccess: () => {
      setControlError(null);
      void qc.invalidateQueries({ queryKey: ["form", formId] });
      void qc.invalidateQueries({ queryKey: ["form-history", formId] });
    },
    onError: (err) => setControlError(err instanceof Error ? err.message : "Не удалось запустить"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelExtraction(formId),
    onSuccess: () => {
      setDraft(null);
      setControlError(null);
      void qc.invalidateQueries({ queryKey: ["form", formId] });
      void qc.invalidateQueries({ queryKey: ["form-history", formId] });
    },
    onError: (err) => setControlError(err instanceof Error ? err.message : "Не удалось отменить"),
  });

  const mode = extractionPanelMode({
    role,
    hasDraft: Boolean(draft),
    status,
    noDocuments,
    hasDocuments,
  });
  const showControls = canControlExtraction(role, status);
  if (mode === "hide") return null;

  const shellClass = embedded ? "space-y-3" : "panel space-y-3 p-4";
  const idleShellClass = embedded ? "space-y-2" : "panel space-y-2 p-4";

  const requestStartExtraction = () => {
    const needsConfirm = Boolean(draft?.meta.confirmed);
    if (
      needsConfirm &&
      !window.confirm(
        "Перезапуск заменит подтверждённые распознанные данные. Продолжить?",
      )
    ) {
      return;
    }
    startMut.mutate();
  };

  const controlBar =
    showControls ? (
      <div className="space-y-1.5" data-testid="extraction-controls">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            disabled={startMut.isPending}
            onClick={requestStartExtraction}
          >
            {draft ? "Перезапустить распознавание" : "Запустить распознавание"}
          </button>
          {draft && !draft.meta.confirmed ? (
            <button
              type="button"
              className="rounded-md bg-destructive-soft px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              Отменить распознавание
            </button>
          ) : null}
        </div>
        {!draft?.meta.confirmed ? (
          <p className="text-xs text-muted-foreground" data-testid="extraction-help">
            {canConfirm
              ? "Распознавание читает загруженные документы и подставляет сумму, валюту, реквизиты и позиции в форму. Заявка при этом никуда не отправляется — вы сможете проверить и исправить каждое поле до подтверждения. Перезапуск заменит текущие распознанные данные новыми."
              : "Распознавание читает загруженные документы и подставляет сумму, валюту, реквизиты и позиции в форму. В мастере поля правятся в форме заявки; здесь — просмотр результата и перезапуск. Подтверждение распознавания на этом шаге недоступно."}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground" data-testid="extraction-help">
            Распознавание подтверждено — поля только для просмотра. Перезапуск потребует подтверждения.
          </p>
        )}
      </div>
    ) : null;

  if (mode === "idle" || mode === "pending") {
    return (
      <div className={idleShellClass} data-testid={mode === "pending" ? "extraction-pending" : "extraction-idle"}>
        {!embedded ? <h2 className="text-sm font-semibold text-foreground">Распознавание</h2> : null}
        <p className="text-sm text-muted-foreground">
          {mode === "pending"
            ? "Документы распознаются в фоне. Когда появятся данные — проверьте их здесь."
            : "Загрузите документы, затем запустите распознавание — или заполните параметры вручную."}
        </p>
        {controlBar}
        {controlError ? <p className="text-xs text-destructive">{controlError}</p> : null}
      </div>
    );
  }
  if (!draft) return null;

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
    <div className={cn(shellClass, "min-w-0 max-w-full overflow-hidden")} data-testid="extraction-review">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {!embedded ? <h2 className="text-sm font-semibold text-foreground">Распознанные данные</h2> : null}
        <p className="text-xs text-muted-foreground">
          {draft.meta.engine_id ?? "engine"}
          {draft.meta.engine_id === "docling" ? " · пилот Docling" : ""}
          {canConfirm && !confirmed ? " · проверьте позиции перед подтверждением" : ""}
        </p>
      </div>
      {!confirmed ? controlBar : null}
      <p className="text-xs text-muted-foreground">
        Поле без правки помечено «распознано». Если значение изменили — «изменено». Цвет строки с низкой уверенностью
        это не заменяет.
        {draft.meta.engine_id === "docling" && canConfirm
          ? " Пустые поля на пилоте Docling — норма: дозаполните вручную перед подтверждением."
          : ""}
        {draft.meta.engine_id === "docling" && !canConfirm
          ? " Пустые поля на пилоте Docling — норма: дозаполните вручную в форме заявки."
          : ""}
      </p>
      {!canConfirm && !confirmed ? (
        <p
          className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
          data-testid="extraction-view-only-banner"
        >
          В мастере поля правятся в форме; здесь просмотр и перезапуск. Подтверждение распознавания на этом шаге
          недоступно.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2" data-testid="extraction-header-fields">
        <label className="text-xs text-muted-foreground">
          Сумма
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.invoice_amount ?? ""}
            onChange={(e) => updateHeader("invoice_amount", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="min-w-0 text-xs text-muted-foreground">
          Валюта · {fieldMark(draft.header.currency ?? "", origin?.header.currency)}
          <CatalogPick
            value={draft.header.currency ?? ""}
            options={currencyOptions}
            disabled={!editable}
            onChange={(value) => updateHeader("currency", value)}
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
          Дата договора
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.contract_date ?? ""}
            onChange={(e) => updateHeader("contract_date", e.target.value)}
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
        <label className="text-xs text-muted-foreground">
          Дата инвойса
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.invoice_date ?? ""}
            onChange={(e) => updateHeader("invoice_date", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Компания
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={draft.header.company_name ?? ""}
            onChange={(e) => updateHeader("company_name", e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="min-w-0 text-xs text-muted-foreground">
          Код ТН ВЭД · {fieldMark((draft.header.hs_codes ?? []).join(","), (origin?.header.hs_codes ?? []).join(","))}
          <CatalogPick
            value={draft.header.hs_codes?.[0] ?? ""}
            options={hsOptions}
            disabled={!editable}
            onChange={(value) =>
              setDraft({
                ...draft,
                header: { ...draft.header, hs_codes: value ? [value] : [] },
              })
            }
          />
        </label>
      </div>
      <div className="min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm" data-testid="extraction-line-items">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Наименование</th>
              <th className="py-1 pr-2">Кол-во</th>
              <th className="py-1 pr-2">Ед.</th>
              <th className="py-1 pr-2">Цена</th>
              <th className="py-1 pr-2">Сумма</th>
              <th className="py-1 pr-2">Валюта</th>
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
                    className="w-16 rounded border border-border bg-background px-1 py-0.5"
                    value={row.unit ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { unit: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className="w-24 rounded border border-border bg-background px-1 py-0.5"
                    value={row.unit_price ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
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
                <td className="py-1 pr-2">
                  <CatalogPick
                    value={row.currency ?? ""}
                    options={currencyOptions}
                    disabled={!editable}
                    onChange={(value) => updateLine(idx, { currency: value })}
                  />
                  <span className="block text-[10px] text-muted-foreground">
                    {fieldMark(row.currency ?? "", origin?.line_items[idx]?.currency)}
                  </span>
                </td>
                <td className="py-1">
                  <CatalogPick
                    value={row.hs_code ?? ""}
                    options={hsOptions}
                    disabled={!editable}
                    onChange={(value) => updateLine(idx, { hs_code: value })}
                  />
                  <span className="block text-[10px] text-muted-foreground">
                    {fieldMark(row.hs_code ?? "", origin?.line_items[idx]?.hs_code)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground" data-testid="extraction-meta">
        <p>
          {[
            draft.doc_type ? `Тип документа: ${draft.doc_type}` : null,
            draft.language ? `Язык: ${draft.language}` : null,
            typeof draft.confidence === "number"
              ? `Уверенность распознавания: ${Math.round(draft.confidence * 100)}%`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Дополнительные сведения о документе не распознаны."}
        </p>
        {draft.warnings && draft.warnings.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4 text-amber-600" data-testid="extraction-warnings">
            {draft.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {(documentKind === "order"
        ? orderExtractionWarnings(draft, formAmountMinor, formCurrency)
        : extractionAmountWarnings(draft)
      ).length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700" data-testid="extraction-amount-mismatch">
          {(documentKind === "order"
            ? orderExtractionWarnings(draft, formAmountMinor, formCurrency)
            : extractionAmountWarnings(draft)
          ).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
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
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Распознавание подтверждено — данные в gold для обучения.</p>
          {showControls ? (
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
              disabled={startMut.isPending}
              onClick={requestStartExtraction}
            >
              Перезапустить распознавание
            </button>
          ) : null}
        </div>
      ) : null}
      {savedNote ? (
        <p className="text-xs font-medium text-accent" data-testid="extraction-saved">
          {savedNote}
        </p>
      ) : null}
      {controlError ? <p className="text-xs text-destructive">{controlError}</p> : null}
      {mutation.isError ? (
        <p className="text-xs text-destructive">Не удалось сохранить. Повторите или заполните вручную.</p>
      ) : null}
    </div>
  );
}
