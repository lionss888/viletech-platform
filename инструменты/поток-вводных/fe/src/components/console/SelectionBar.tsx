import { useState } from "react";
import { Sparkle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  count: number;
  busy?: boolean;
  onClear: () => void;
  onAnalyzeSelected: (prompt: string) => void;
  onAnalyzeChat: () => void;
  onAskAgent: (prompt: string) => void;
};

export function SelectionBar({
  count,
  busy,
  onClear,
  onAnalyzeSelected,
  onAnalyzeChat,
  onAskAgent,
}: Props) {
  const [question, setQuestion] = useState("");
  if (count === 0) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-2">
      <div className="rounded-xl border border-primary/50 bg-surface-raised p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-foreground">
            Выбрано: <span className="text-primary">{count}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 font-mono text-[11px] text-muted-foreground"
            onClick={onClear}
          >
            <X className="size-3" /> Снять выбор
          </Button>
        </div>

        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Вопрос агенту по выбранным сообщениям…"
          className="mt-2 min-h-16 resize-none border-border bg-background/50 text-sm"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onAnalyzeSelected(question)}
          >
            <Sparkle className="size-3.5" /> Разобрать выбранные
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border bg-surface"
            disabled={busy}
            onClick={onAnalyzeChat}
          >
            Разобрать весь чат
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border bg-surface"
            disabled={busy}
            onClick={() => onAskAgent(question)}
          >
            Спросить у агента
          </Button>
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          «Разобрать» — локально. «Спросить у агента» — нужен CURSOR_API_KEY (key_…) в Доступ.
        </p>
      </div>
    </div>
  );
}
