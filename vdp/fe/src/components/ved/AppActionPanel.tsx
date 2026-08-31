import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { transitionForm } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/session";
import { appActionsFor, type AppFormAction } from "@/lib/ved/app-actions";
import type { ActionTone, PaymentForm } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  quiet: "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
  danger: "bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground",
};

export function AppActionPanel({ form }: { form: PaymentForm }) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<AppFormAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actions = appActionsFor(role ?? "user", form.status);

  const mutation = useMutation({
    mutationFn: (action: AppFormAction) => transitionForm(form.id, action.coreAction),
    onSuccess: async () => {
      setPending(null);
      setReason("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      await queryClient.invalidateQueries({ queryKey: ["form", form.id] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setError(err.message);
      else setError("Не удалось выполнить действие");
    },
  });

  if (actions.length === 0) {
    return (
      <div className="panel p-4">
        <p className="label-caps">Действия</p>
        <p className="mt-2 text-sm text-muted-foreground">
          На этом статусе для вашей роли действий нет — заявка у другого участника процесса.
        </p>
      </div>
    );
  }

  function run(action: AppFormAction) {
    if ((action.requiresReason || action.confirm) && pending?.id !== action.id) {
      setPending(action);
      setReason("");
      setError(null);
      return;
    }
    if (action.requiresReason && reason.trim().length < 3) {
      setError("Укажите причину (минимум 3 символа)");
      return;
    }
    mutation.mutate(action);
  }

  return (
    <div className="panel p-4">
      <p className="label-caps">Доступные действия</p>
      <div className="mt-3 flex flex-col gap-2">
        {actions.map((action) => (
          <div key={action.id}>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => run(action)}
              className={cn("w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors", TONE[action.tone])}
            >
              {action.label}
            </button>
            {pending?.id === action.id && (
              <div className="mt-2 rounded-md bg-muted p-3">
                {action.confirm && <p className="text-sm font-medium">{action.confirm}</p>}
                {action.requiresReason && (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Причина возврата или отклонения"
                    rows={3}
                    className="field mt-2 resize-none"
                  />
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={mutation.isPending || (action.requiresReason && reason.trim().length < 3)}
                    onClick={() => run(action)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40"
                  >
                    Подтвердить
                  </button>
                  <button type="button" onClick={() => setPending(null)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
