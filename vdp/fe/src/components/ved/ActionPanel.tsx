import { useState } from "react";
import { toast } from "sonner";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { useAuth } from "@/lib/auth/session";
import { appActionsFor } from "@/lib/ved/app-actions";
import { actionsFor } from "@/lib/ved/actions";
import { marksFor } from "@/lib/ved/compliance";
import { useVedOptional } from "@/lib/ved/store";
import { usePlatformAction } from "@/lib/ved/use-platform-forms";
import { useIsDemoWorkspace } from "@/lib/ved/workspace";
import type { ActionTone, FormAction, PaymentForm } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  quiet: "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
  danger: "bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground",
};

export function ActionPanel({
  form,
  title = "Доступные действия",
  lockNote,
  note,
}: {
  form: PaymentForm;
  title?: string;
  note?: string | undefined;
  lockNote?: string | undefined;
}) {
  const isDemo = useIsDemoWorkspace();
  const demo = useVedOptional();
  const auth = useAuth();
  const platformAction = usePlatformAction(isDemo ? "" : form.id);
  const [pending, setPending] = useState<FormAction | null>(null);
  const [reason, setReason] = useState("");
  const [mark, setMark] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const activeRole = isDemo ? demo?.session?.role ?? "user" : auth.session?.role ?? "user";
  const actions = isDemo ? actionsFor(activeRole, form.status) : appActionsFor(activeRole, form.status);
  const complianceTools = demo?.complianceTools ?? [];
  const marks = marksFor(complianceTools, "form");

  if (actions.length === 0) {
    return (
      <div className="panel p-4">
        <p className="label-caps">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          На этом статусе для вашей роли действий нет — заявка у другого участника процесса.
        </p>
      </div>
    );
  }

  function close() {
    setPending(null);
    setReason("");
    setMark("");
    setFileName("");
    setFile(null);
  }

  async function run(action: FormAction, extras?: { reason?: string; fileName?: string; mark?: string; file?: File }) {
    if (isDemo && demo) {
      demo.applyAction(form.id, action, extras);
      return;
    }
    const appAction = appActionsFor(activeRole, form.status).find((a) => a.id === action.id);
    if (!appAction) return;
    setBusy(true);
    try {
      await platformAction.mutateAsync({
        action: appAction,
        extras: {
          comment: extras?.reason || extras?.mark,
          file: extras?.file,
        },
      });
      toast.success("Действие выполнено");
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  function start(action: FormAction) {
    if (action.requiresReason || action.requiresFile || action.requiresMark || action.confirm) {
      setReason("");
      setMark("");
      setFileName("");
      setFile(null);
      setPending(action);
      return;
    }
    void run(action, {});
  }

  function confirm() {
    if (!pending) return;
    void run(pending, { reason, fileName, mark, file: file ?? undefined });
    close();
  }

  const blocked =
    !!pending &&
    ((pending.requiresReason && reason.trim().length < 3) ||
      (pending.requiresFile && !fileName && !file) ||
      (pending.requiresMark && !mark));

  const isApproval = (action: FormAction) => action.id.includes("accept") || action.id.includes("start");

  return (
    <div className="panel p-4">
      <p className="label-caps">{title}</p>
      {lockNote && <p className="mt-2 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{lockNote}</p>}
      {!lockNote && note && <p className="mt-2 rounded-md bg-wait-soft px-2 py-1.5 text-xs text-wait">{note}</p>}
      <div className="mt-3 flex flex-col gap-2">
        {actions.map((action) => {
          const disabled = !!lockNote && isApproval(action);
          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled || busy}
              title={disabled ? lockNote : action.label}
              onClick={() => start(action as FormAction)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                TONE[action.tone],
              )}
            >
              {action.label}
            </button>
          );
        })}
      </div>

      <Modal
        open={!!pending}
        onOpenChange={(open) => !open && close()}
        title={pending?.label ?? ""}
        description={pending?.confirm}
        footer={
          <>
            <ModalButton variant="quiet" onClick={close}>
              Отмена
            </ModalButton>
            <ModalButton disabled={blocked || busy} onClick={confirm}>
              Подтвердить
            </ModalButton>
          </>
        }
      >
        {pending?.requiresReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field min-h-24 w-full"
            placeholder="Причина (минимум 3 символа)"
          />
        )}
        {pending?.requiresMark && (
          <select value={mark} onChange={(e) => setMark(e.target.value)} className="field mt-2 w-full">
            <option value="">Выберите отметку</option>
            {marks.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        {pending?.requiresFile && (
          <input
            type="file"
            className="field mt-2 w-full"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              setFile(picked ?? null);
              setFileName(picked?.name ?? "");
            }}
          />
        )}
      </Modal>
    </div>
  );
}
