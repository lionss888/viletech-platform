import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HitlCard } from "@/lib/console-data";

const statusStyles: Record<HitlCard["status"], string> = {
  approved: "bg-success/15 text-success border-success/40",
  awaiting_approve: "bg-warning/15 text-warning border-warning/40",
  rejected: "bg-danger/15 text-danger border-danger/40",
};

const statusLabels: Record<HitlCard["status"], string> = {
  approved: "согласовано",
  awaiting_approve: "ждёт решения",
  rejected: "отклонено",
};

function Card({
  card,
  busy,
  onApprove,
  onReject,
  onAskAgent,
}: {
  card: HitlCard;
  busy?: boolean;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
  onAskAgent: (id: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const long = card.text.length > 220;

  const send = () => {
    const text = question.trim();
    if (!text) return;
    onAskAgent(card.id, text);
    setQuestion("");
    setAsking(false);
    toast.success("Вопрос отправлен агенту", { description: text });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-[11px] ${statusStyles[card.status]}`}
        >
          {statusLabels[card.status]}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">{card.author}</span>
      </div>
      <p
        className={`mt-3 text-sm leading-relaxed text-foreground/90 ${
          long && !expanded ? "line-clamp-4" : ""
        }`}
      >
        {card.text}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {long && (
          <button
            type="button"
            className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Свернуть" : "Показать полностью"}
          </button>
        )}
        {card.history && card.history.length > 0 && (
          <button
            type="button"
            className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory
              ? "Скрыть прошлые сообщения"
              : `Прошлые сообщения (${card.history.length})`}
          </button>
        )}
      </div>
      {showHistory && card.history && (
        <ul className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
          {card.history.map((h, i) => (
            <li key={i} className="text-[12px] leading-relaxed">
              <span className="text-muted-foreground">
                {h.time} · {h.author}
              </span>
              <p className="text-foreground/90">{h.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        {card.status === "awaiting_approve" ? (
          <>
            <Button
              size="sm"
              className="h-8 flex-1"
              disabled={busy}
              onClick={() => void onApprove(card.id)}
            >
              Согласовать
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 border-border bg-surface-raised text-danger hover:text-danger"
              disabled={busy}
              onClick={() => void onReject(card.id)}
            >
              Отклонить
            </Button>
          </>
        ) : (
          <p className="flex-1 font-mono text-[11px] text-muted-foreground">
            Решение уже зафиксировано
          </p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-3 text-[12px] text-muted-foreground"
          disabled={busy}
          onClick={() => setAsking((v) => !v)}
        >
          Спросить у агента
        </Button>
      </div>
      {asking && (
        <div className="mt-3">
          <Textarea
            autoFocus
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Что уточнить у агента по этой карточке?"
            className="min-h-16 resize-none border-border bg-background/50 text-sm"
            disabled={busy}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-7" disabled={busy || !question.trim()} onClick={send}>
              Отправить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[12px] text-muted-foreground"
              onClick={() => {
                setAsking(false);
                setQuestion("");
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HitlPanel({
  open,
  onOpenChange,
  cards,
  busy,
  onApprove,
  onReject,
  onAskAgent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cards: HitlCard[];
  busy?: boolean;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
  onAskAgent: (id: string, text: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-border bg-background sm:max-w-md"
      >
        <SheetHeader className="gap-1 px-5 pb-4 pt-5">
          <SheetTitle className="text-base font-semibold">Карточки на решение</SheetTitle>
          <SheetDescription className="text-[12px]">
            Требуют вашего согласования
          </SheetDescription>
        </SheetHeader>
        <div className="console-scroll space-y-3 overflow-y-auto px-5 pb-6">
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              busy={busy}
              onApprove={onApprove}
              onReject={onReject}
              onAskAgent={onAskAgent}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
