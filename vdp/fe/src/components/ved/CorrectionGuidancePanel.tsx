import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import {
  correctionHints,
  isRateCorrection,
  sectionLabel,
} from "@/lib/ved/correction-guidance";

type Props = {
  formId: string;
  rejectMark?: string;
  rejectText?: string;
  canEdit: boolean;
};

/**
 * Guided block under return banner: what to fix and optional rate acknowledgment.
 */
export function CorrectionGuidancePanel({ formId, rejectMark, rejectText, canEdit }: Props) {
  const hints = correctionHints(rejectMark, rejectText);
  const needsRate = isRateCorrection(rejectMark, rejectText);
  const qc = useQueryClient();
  const [rateValue, setRateValue] = useState("");
  const [rateCurrency, setRateCurrency] = useState("USD");
  const [rateAck, setRateAck] = useState(false);

  const saveRate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/forms/${formId}/rate`, {
        method: "POST",
        body: JSON.stringify({ value: rateValue, currency: rateCurrency, source: "manual" }),
      }),
    onSuccess: () => {
      setRateAck(true);
      void qc.invalidateQueries({ queryKey: ["form", formId] });
    },
  });

  return (
    <div className="mt-3 space-y-3" data-testid="correction-guidance">
      <p className="text-sm font-semibold text-return">Что исправить</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-return">
        {hints.map((hint) => (
          <li key={hint.id}>
            <span className="font-medium">[{sectionLabel(hint.section)}]</span> {hint.title}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        После правок нажмите «Отправить исправления» справа. Подтверждение распознавания OCR не заменяет эту отправку.
      </p>
      {needsRate && canEdit && (
        <div className="rounded-md border border-return/40 bg-background p-3" data-testid="correction-rate">
          <p className="text-sm font-semibold text-foreground">Согласование курса</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Укажите согласованный курс и сохраните — затем отправьте исправления.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground">
              Курс
              <input
                className="mt-1 w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                placeholder="95.5"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Валюта
              <input
                className="mt-1 w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value.toUpperCase())}
              />
            </label>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              disabled={!rateValue.trim() || saveRate.isPending}
              onClick={() => saveRate.mutate()}
            >
              {saveRate.isPending ? "Сохранение…" : "Сохранить курс"}
            </button>
          </div>
          {rateAck ? (
            <p className="mt-2 text-xs text-accent">Курс сохранён — можно отправлять исправления.</p>
          ) : null}
          {saveRate.isError ? (
            <p className="mt-2 text-xs text-destructive">
              Не удалось сохранить курс. Уточните значение у менеджера или приложите документ с курсом.
            </p>
          ) : null}
        </div>
      )}
      {needsRate && !canEdit && (
        <p className="text-xs text-muted-foreground">
          По замечанию нужен согласованный курс — откройте заявку под ролью клиента, чтобы указать курс.
        </p>
      )}
    </div>
  );
}
