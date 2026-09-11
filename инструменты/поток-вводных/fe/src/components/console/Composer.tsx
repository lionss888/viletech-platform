import { useRef, useState } from "react";
import { Bookmark, Paperclip, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  busy?: boolean;
  onSend: (input: {
    text: string;
    asIntake: boolean;
    mirrorToTg: boolean;
    files: File[];
  }) => Promise<void> | void;
  onSavePrompt: (text: string) => Promise<void> | void;
};

export function Composer({ busy, onSend, onSavePrompt }: Props) {
  const [text, setText] = useState("");
  const [asInput, setAsInput] = useState(false);
  const [toTelegram, setToTelegram] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder = toTelegram
    ? asInput
      ? "Напишите сообщение — оно уйдёт в Telegram и попадёт агенту как задание."
      : "Напишите сообщение — оно уйдёт в Telegram собеседнику."
    : asInput
      ? "Напишите задание / ввод для HITL — без зеркала в Telegram, если выключено."
      : "Напишите заметку для себя — она останется в консоли (без Telegram).";

  const hint = toTelegram
    ? asInput
      ? "Уйдёт в Telegram и станет вводом (as intake)."
      : "Уйдёт в Telegram как обычное сообщение."
    : asInput
      ? "Останется здесь как ввод / задание."
      : "Останется здесь как ваша заметка.";

  return (
    <div className="border-t border-border bg-background/90 backdrop-blur">
      <div className="mx-auto w-full max-w-4xl px-4 py-3">
        <div className="rounded-xl border border-border bg-surface focus-within:border-primary/50">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-describedby="composer-hint"
            className="min-h-20 resize-none border-0 bg-transparent text-sm leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/80"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 pb-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label="Прикрепить файл"
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
              {files.length > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  файлов: {files.length}
                </span>
              )}
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Switch checked={asInput} onCheckedChange={setAsInput} />
                Задание / ввод
              </label>
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Switch checked={toTelegram} onCheckedChange={setToTelegram} />
                Отправить в Telegram
              </label>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => onSavePrompt(text)}
              >
                <Bookmark className="size-3.5" />
                <span className="hidden sm:inline">Сохранить запрос</span>
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                type="button"
                disabled={busy || !text.trim()}
                onClick={async () => {
                  await onSend({
                    text,
                    asIntake: asInput,
                    mirrorToTg: toTelegram,
                    files,
                  });
                  setText("");
                  setFiles([]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <SendHorizontal className="size-3.5" /> Отправить
              </Button>
            </div>
          </div>
        </div>
        <p id="composer-hint" className="mt-1.5 text-[11px] text-muted-foreground">
          {hint}
        </p>
      </div>
    </div>
  );
}
