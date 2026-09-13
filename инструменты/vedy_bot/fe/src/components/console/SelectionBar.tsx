import { useState } from "react";
import { SendHorizontal, Sparkle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  count: number;
  busy?: boolean;
  previewText?: string;
  onClear: () => void;
  onAnalyzeSelected: (prompt: string) => void;
  onAnalyzeChat: () => void;
  onAskAgent: (prompt: string) => void;
  onPublish?: (text: string, target: "manager" | "operator") => void;
  onMgmtDone?: (title: string, body: string) => void;
  onDeleteSelected?: () => void;
};

export function SelectionBar({
  count,
  busy,
  previewText = "",
  onClear,
  onAnalyzeSelected,
  onAnalyzeChat,
  onAskAgent,
  onPublish,
  onMgmtDone,
  onDeleteSelected,
}: Props) {
  const [question, setQuestion] = useState("");
  const [publishPreview, setPublishPreview] = useState(false);
  const [edited, setEdited] = useState("");
  const [target, setTarget] = useState<"manager" | "operator">("manager");
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
            disabled={busy}
          >
            <X className="size-3" /> Снять выбор
          </Button>
        </div>

        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Вопрос агенту по выбранным сообщениям…"
          className="mt-2 min-h-16 resize-none border-border bg-background/50 text-sm"
          disabled={busy}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onAnalyzeSelected(question.trim())}
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
            onClick={() => onAskAgent(question.trim())}
          >
            Спросить у агента
          </Button>
          {onPublish && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-border bg-surface"
              disabled={busy}
              onClick={() => {
                setEdited(previewText || question);
                setPublishPreview(true);
              }}
            >
              <SendHorizontal className="size-3.5" /> Отправить выбранное
            </Button>
          )}
          {onMgmtDone && (
            <Button
              size="sm"
              variant="outline"
              className="border-border bg-surface"
              disabled={busy}
              onClick={() => onMgmtDone("Обновление", previewText || question)}
            >
              Mgmt done
            </Button>
          )}
          {onDeleteSelected && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground"
              disabled={busy}
              onClick={onDeleteSelected}
            >
              <Trash2 className="size-3.5" /> Удалить в TG
            </Button>
          )}
        </div>

        {publishPreview && onPublish && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-background/60 p-2">
            <p className="font-mono text-[11px] text-muted-foreground">Превью перед отправкой в TG</p>
            <Textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              className="min-h-24 resize-none border-border text-sm"
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-mono text-[11px] text-muted-foreground">
                Куда:{" "}
                <select
                  className="ml-1 rounded border border-border bg-background px-2 py-1"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as "manager" | "operator")}
                >
                  <option value="manager">менеджер</option>
                  <option value="operator">оператор</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={busy || !edited.trim()}
                onClick={() => {
                  onPublish(edited.trim(), target);
                  setPublishPreview(false);
                }}
              >
                Отправить
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPublishPreview(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          «Разобрать» — локально. «Спросить у агента» — нужен key_…. Отправка в TG проходит sanitize.
        </p>
      </div>
    </div>
  );
}
