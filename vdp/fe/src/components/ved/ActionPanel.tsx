import { useState } from "react";

import { actionsFor } from "@/lib/ved/actions";
import { useVed } from "@/lib/ved/store";
import type { ActionTone, FormAction, PaymentForm } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  quiet: "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
  danger: "bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground",
};

export function ActionPanel({ form }: { form: PaymentForm }) {
  const { session, applyAction } = useVed();
  const [pending, setPending] = useState<FormAction | null>(null);
  const [reason, setReason] = useState("");
  const [fileName, setFileName] = useState("");

  const actions = actionsFor(session?.role ?? "user", form.status);

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

  function run(action: FormAction) {
    if ((action.requiresReason || action.requiresFile || action.confirm) && pending?.id !== action.id) {
      setPending(action);
      setReason("");
      setFileName("");
      return;
    }
    applyAction(form.id, action, { reason, fileName });
    setPending(null);
    setReason("");
    setFileName("");
  }

  return (
    <div className="panel p-4">
      <p className="label-caps">Доступные действия</p>
      <div className="mt-3 flex flex-col gap-2">
        {actions.map((action) => (
          <div key={action.id}>
            <button
              type="button"
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
                {action.requiresFile && (
                  <label className="mt-2 block">
                    <span className="label-caps">Документ</span>
                    <input
                      type="file"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                      className="mt-1 block w-full text-xs text-muted-foreground"
                    />
                  </label>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={(action.requiresReason && reason.trim().length < 3) || (action.requiresFile && !fileName)}
                    onClick={() => run(action)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40"
                  >
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
