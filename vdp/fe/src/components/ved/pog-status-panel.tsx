import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { generateFormDoc } from "@/lib/api/docs";
import type { PaymentForm } from "@/lib/ved/types";

const POG_LABEL: Record<string, string> = {
  idle: "Поручение ещё не формировалось",
  pending: "Формируем PDF поручения…",
  success: "PDF поручения готов",
  failed: "Не удалось сформировать PDF",
};

/** POG generation status on the form card (manager/root). */
export function PogStatusPanel({ form }: { form: PaymentForm }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const status = form.pogStatus ?? "idle";
  const label = POG_LABEL[status] ?? status;
  const canRetry = status === "failed" || status === "idle";
  const retry = useMutation({
    mutationFn: () => generateFormDoc(form.id, "principal_order"),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["form", form.id] });
      void qc.invalidateQueries({ queryKey: ["forms"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Не удалось запустить генерацию"),
  });

  if (status === "success" && !form.pogFileId) {
    return null;
  }

  return (
    <div className="panel p-4" data-testid="pog-status-panel">
      <p className="label-caps">Генерация поручения</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      {form.pogKind ? (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">тип: {form.pogKind}</p>
      ) : null}
      {canRetry ? (
        <button
          type="button"
          data-testid="pog-retry"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {retry.isPending ? "Запуск…" : "Сформировать поручение"}
        </button>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
