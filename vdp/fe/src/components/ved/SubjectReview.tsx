import { useState } from "react";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { marksFor, subjectState, type ReviewSubject } from "@/lib/ved/compliance";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { cn } from "@/lib/utils";

type Verdict = "approved" | "waiting_verification" | "blocked";

const VERDICT: Record<Verdict, { label: string; title: string; needsMark: boolean; tone: string }> = {
  approved: {
    label: "Проверен",
    title: "Одобрить участника",
    needsMark: false,
    tone: "bg-accent text-accent-foreground",
  },
  waiting_verification: {
    label: "Запросить сведения",
    title: "Запросить сведения по участнику",
    needsMark: true,
    tone: "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
  },
  blocked: {
    label: "Заблокировать",
    title: "Заблокировать участника",
    needsMark: true,
    tone: "bg-destructive-soft text-destructive",
  },
};

/** Проверка участников сделки (организация клиента и контрагент) — отдельный контур от рассмотрения заявки. */
export function SubjectReview({
  subjects,
  readOnly = false,
  compact = false,
}: {
  subjects: ReviewSubject[];
  readOnly?: boolean;
  compact?: boolean;
}) {
  const { complianceTools, saveRefRecord } = usePlatformStore();
  const marks = marksFor(complianceTools, "organization");
  const [pending, setPending] = useState<{ subject: ReviewSubject; verdict: Verdict } | null>(null);
  const [mark, setMark] = useState("");
  const [note, setNote] = useState("");

  function close() {
    setPending(null);
    setMark("");
    setNote("");
  }

  function confirm() {
    if (!pending) return;
    const { subject, verdict } = pending;
    saveRefRecord(
      subject.key,
      {
        id: subject.id,
        status: verdict,
        complianceMark: verdict === "approved" ? "" : mark,
        complianceNote: verdict === "approved" ? "" : note,
      },
      subject.id,
    );
    close();
  }

  const meta = pending ? VERDICT[pending.verdict] : null;
  const blocked = !!meta && meta.needsMark && (!mark || note.trim().length < 3);

  return (
    <div className={cn("panel", compact ? "p-4" : "p-4")}>
      <p className="label-caps">Проверка участников сделки</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Блокировка организации останавливает отправку новых заявок и согласование текущих. Одобрение участника разблокирует
        ICO/ECO-путь для заявок этой организации.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {subjects.map((subject) => {
          const state = subjectState(subject.status);
          return (
            <li key={`${subject.key}-${subject.id}`} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label-caps">{subject.kind}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", state.cls)}>{state.text}</span>
              </div>
              <p className="mt-1 text-sm font-semibold">{subject.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{subject.detail}</p>
              {subject.mark && (
                <p className="mt-1 text-xs text-wait">
                  Отметка: {subject.mark}
                  {subject.note ? ` · ${subject.note}` : ""}
                </p>
              )}
              {!readOnly && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(VERDICT) as Verdict[]).map((verdict) => (
                    <button
                      key={verdict}
                      type="button"
                      onClick={() => {
                        setMark("");
                        setNote("");
                        setPending({ subject, verdict });
                      }}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90",
                        VERDICT[verdict].tone,
                      )}
                    >
                      {VERDICT[verdict].label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {subjects.length === 0 && <li className="py-2 text-sm text-muted-foreground">Участники не определены.</li>}
      </ul>

      <Modal
        open={pending !== null}
        onOpenChange={(open) => !open && close()}
        title={meta?.title ?? ""}
        description={pending ? `${pending.subject.kind}: ${pending.subject.name}` : ""}
        footer={
          <>
            <ModalButton variant="quiet" onClick={close}>
              Отмена
            </ModalButton>
            <ModalButton
              variant={pending?.verdict === "blocked" ? "danger" : "primary"}
              onClick={confirm}
              disabled={blocked}
            >
              Подтвердить
            </ModalButton>
          </>
        }
      >
        {meta?.needsMark && (
          <div className="space-y-3">
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
            <label className="block">
              <span className="label-caps">Комментарий для клиента</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Какие сведения или документы нужны по участнику"
                className="field mt-1 resize-none"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
