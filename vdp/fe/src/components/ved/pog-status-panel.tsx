import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { generateFormDoc } from "@/lib/api/docs";
import type { PaymentForm } from "@/lib/ved/types";

const POG_LABEL: Record<string, string> = {
  idle: "PDF поручения ещё не сформирован — дождитесь генерации или запустите её.",
  pending: "Формируем PDF поручения…",
  failed: "Не удалось сформировать PDF",
};

/**
 * POG generation status on the form card (manager/root).
 * Hidden after success so the ready PDF does not keep a success widget in the way.
 */
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
  if (status === "success") {
    return null;
  }
  return (
    <div className="panel p-4" data-testid="pog-status-panel">
      <p className="label-caps">Генерация поручения</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      {status === "pending" ? (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-wait/20"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="Формируем PDF поручения"
          data-testid="pog-progress"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-wait" />
        </div>
      ) : null}
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
