import { useState } from "react";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { actionsFor } from "@/lib/ved/actions";
import { marksFor } from "@/lib/ved/compliance";
import { useVed } from "@/lib/ved/store";
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
  /** Информационная подсказка над кнопками. */
  note?: string | undefined;
  /** Пояснение, почему одобрение заявки временно недоступно (например не проверены участники). */
  lockNote?: string | undefined;
}) {
  const { session, applyAction, complianceTools } = useVed();
  const [pending, setPending] = useState<FormAction | null>(null);
  const [reason, setReason] = useState("");
  const [mark, setMark] = useState("");
  const [fileName, setFileName] = useState("");

  const actions = actionsFor(session?.role ?? "user", form.status);
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
  }

  function start(action: FormAction) {
    if (action.requiresReason || action.requiresFile || action.requiresMark || action.confirm) {
      setReason("");
      setMark("");
      setFileName("");
      setPending(action);
      return;
    }
    applyAction(form.id, action, {});
  }

  function confirm() {
    if (!pending) return;
    applyAction(form.id, pending, { reason, fileName, mark });
    close();
  }

  const blocked =
    !!pending &&
    ((pending.requiresReason && reason.trim().length < 3) ||
      (pending.requiresFile && !fileName) ||
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
              disabled={disabled}
              title={disabled ? lockNote : action.label}
              onClick={() => start(action)}
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
        open={pending !== null}
        onOpenChange={(v) => !v && close()}
        title={pending?.label ?? ""}
        description={pending?.confirm ?? `Заявка ${form.number}. Подтвердите действие.`}
        footer={
          <>
            <ModalButton variant="quiet" onClick={close}>
              Отмена
            </ModalButton>
            <ModalButton
              variant={pending?.tone === "danger" ? "danger" : "primary"}
              onClick={confirm}
              disabled={blocked}
            >
              Подтвердить
            </ModalButton>
          </>
        }
      >
        {pending?.requiresMark && (
          <label className="block">
            <span className="label-caps">Отметка комплаенс</span>
            <select value={mark} onChange={(e) => setMark(e.target.value)} className="field mt-1">
              <option value="">Выберите отметку</option>
              {marks.map((tool) => (
                <option key={tool.id} value={tool.title}>
                  {tool.code} — {tool.title}
                </option>
              ))}
            </select>
            {marks.find((t) => t.title === mark) && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Клиент увидит: {marks.find((t) => t.title === mark)?.instruction}
              </span>
            )}
          </label>
        )}
        {pending?.requiresReason && (
          <label className="block">
            <span className="label-caps">Комментарий для клиента</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Что именно нужно исправить или предоставить"
              rows={3}
              className="field mt-1 resize-none"
            />
          </label>
        )}
        {pending?.requiresFile && (
          <label className="block">
            <span className="label-caps">Документ</span>
            <input
              type="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              className="mt-1 block w-full text-xs text-muted-foreground"
            />
            {fileName && <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{fileName}</span>}
          </label>
        )}
      </Modal>
    </div>
  );
}
