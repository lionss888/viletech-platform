import { useState } from "react";
import { Bot, Check, ChevronDown, Info, Send, User } from "lucide-react";
import type { ConsoleMessage } from "@/lib/console-data";

type Props = {
  message: ConsoleMessage;
  selected: boolean;
  onToggle: (id: string) => void;
};

function time(ts: string) {
  return ts.slice(11, 16);
}

const kind = {
  agent: { label: "разбор", Icon: Bot },
  out: { label: "исходящее", Icon: Send },
  in: { label: "входящее", Icon: User },
} as const;

export function MessageCard({ message, selected, onToggle }: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const { label, Icon } = kind[message.direction];
  const isAgent = message.direction === "agent";

  return (
    <article
      onClick={() => onToggle(message.id)}
      className={`group cursor-pointer rounded-xl border transition-colors ${
        selected
          ? "border-primary/70 bg-surface-raised"
          : "border-border bg-surface hover:border-primary/35"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-2">
        <button
          type="button"
          aria-label={selected ? "Снять выбор" : "Выбрать сообщение"}
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(message.id);
          }}
          className={`grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background/50"
          }`}
        >
          {selected && <Check className="size-3" />}
        </button>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
            isAgent ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary"
          }`}
        >
          <Icon className="size-3" />
          {label}
        </span>

        <span className="min-w-0 truncate font-mono text-[11px] text-foreground/80">
          {message.author}
        </span>

        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
          {time(message.timestamp)}
        </span>
      </div>

      <div className="px-4 py-3">
        {message.title && (
          <h3 className="font-mono text-sm text-foreground">{message.title}</h3>
        )}

        {message.summary && (
          <p
            className={`text-[0.9375rem] leading-relaxed text-foreground/90 ${message.title ? "mt-1.5" : ""}`}
          >
            {message.summary}
          </p>
        )}

        {message.quotes && message.quotes.length > 0 && (
          <div className="mt-3 rounded-lg bg-background/40 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Ключевые реплики
            </p>
            <div className="mt-1.5 space-y-1.5">
              {message.quotes.map((q, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {q.time} · {q.author}
                  </span>
                  <br />
                  {q.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Рекомендации
            </p>
            <ol className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-foreground/90">
              {message.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="font-mono text-[11px] text-primary">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {message.note && (
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNoteOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Info className="size-3" />
              Служебная информация
              <ChevronDown
                className={`size-3 transition-transform ${noteOpen ? "rotate-180" : ""}`}
              />
            </button>
            {noteOpen && (
              <p className="mt-1.5 rounded-lg bg-background/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {message.note}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
