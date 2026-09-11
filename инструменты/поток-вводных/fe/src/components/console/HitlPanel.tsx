import { useState } from "react";
import { Button } from "@/components/ui/button";
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

function Card({
  card,
  busy,
  onApprove,
  onReject,
  onAskAgent,
}: {
  card: HitlCard;
  busy?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAskAgent?: (id: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = card.text.length > 220;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${statusStyles[card.status]}`}
        >
          {card.status}
        </span>
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {card.id}
        </span>
      </div>
      <p className="mt-2 font-mono text-[11px] text-foreground/70">{card.author}</p>
      <p
        className={`mt-1 text-sm leading-relaxed text-foreground/90 ${
          long && !expanded ? "line-clamp-4" : ""
        }`}
      >
        {card.text}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {long && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 font-mono text-[11px] text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Свернуть" : "Показать полностью"}
          </Button>
        )}
        {card.status === "awaiting_approve" && (
          <>
            <Button
              size="sm"
              className="h-7"
              disabled={busy}
              onClick={() => onApprove?.(card.id)}
            >
              Согласовать
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7"
              disabled={busy}
              onClick={() => onReject?.(card.id)}
            >
              Отклонить
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-border bg-surface-raised"
          disabled={busy}
          onClick={() => onAskAgent?.(card.id, card.text)}
        >
          Спросить у агента
        </Button>
      </div>
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
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAskAgent?: (id: string, text: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-border bg-background sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="font-mono">Карточки HITL</SheetTitle>
          <SheetDescription className="font-mono text-[11px]">
            Требуют решения человека
          </SheetDescription>
        </SheetHeader>
        <div className="console-scroll space-y-3 overflow-y-auto px-4 pb-6">
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
