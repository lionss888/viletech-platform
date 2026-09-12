import { useEffect, useState } from "react";
import { Eye, EyeOff, Inbox, KeyRound, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  agentKeyPresent,
  consoleKeyPresent,
  getAgentKey,
  getToken,
  setAgentKey,
  setToken,
} from "@/lib/api/client";

type Props = {
  messageCount: number;
  selectedCount: number;
  pendingCards: number;
  signedIn: boolean;
  onOpenCards: () => void;
  onOpenPlans?: () => void;
  onSignIn: (token: string) => void;
  onRefresh: () => void;
};

export function ConsoleHeader({
  messageCount,
  pendingCards,
  signedIn,
  onOpenCards,
  onOpenPlans,
  onSignIn,
  onRefresh,
}: Props) {
  const [token, setLocalToken] = useState("");
  const [agentKey, setLocalAgentKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [accessOpen, setAccessOpen] = useState(!signedIn);
  const [consoleOk, setConsoleOk] = useState(false);
  const [agentOk, setAgentOk] = useState(false);

  useEffect(() => {
    setLocalToken(getToken());
    setLocalAgentKey(getAgentKey());
    setConsoleOk(consoleKeyPresent());
    setAgentOk(agentKeyPresent());
  }, [signedIn]);

  useEffect(() => {
    if (signedIn) setAccessOpen(false);
  }, [signedIn]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-mono text-sm font-semibold tracking-tight sm:text-base">
            Консоль чата
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${signedIn ? "bg-success" : "bg-muted-foreground"}`}
              />
              {signedIn ? "подключено" : "нет подключения"}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5" title="INTAKE_CONSOLE_TOKEN">
              <span className={`size-1.5 rounded-full ${consoleOk ? "bg-success" : "bg-warning"}`} />
              консоль {consoleOk ? "токен ок" : "нет Bearer"}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5" title="CURSOR_API_KEY (key_…)">
              <span className={`size-1.5 rounded-full ${agentOk ? "bg-success" : "bg-muted-foreground"}`} />
              агент {agentOk ? "ключ задан" : "без key_…"}
            </span>
            <span aria-hidden>·</span>
            <span>{messageCount} сообщений</span>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 font-mono text-[11px] text-muted-foreground"
          onClick={() => setAccessOpen((v) => !v)}
        >
          <KeyRound className="size-3.5" />
          <span className="hidden sm:inline">Доступ</span>
        </Button>

        {onOpenPlans && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 font-mono text-[11px] text-muted-foreground"
            onClick={onOpenPlans}
          >
            План
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="relative h-9 gap-1.5 border-border bg-surface"
          onClick={onOpenCards}
        >
          <Inbox className="size-4" />
          <span className="hidden sm:inline">Карточки</span>
          {pendingCards > 0 && (
            <span className="rounded-full bg-warning/20 px-1.5 font-mono text-[10px] leading-4 text-warning">
              {pendingCards}
            </span>
          )}
        </Button>
      </div>

      {accessOpen && (
        <div className="border-t border-border bg-surface/60">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={visible ? "text" : "password"}
                  value={token}
                  onChange={(e) => setLocalToken(e.target.value)}
                  placeholder="INTAKE_CONSOLE_TOKEN (Bearer консоли)"
                  className="h-9 border-border bg-background pl-8 font-mono text-xs"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-9 text-muted-foreground"
                aria-label={visible ? "Скрыть токен" : "Показать токен"}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-9 text-muted-foreground"
                aria-label="Сбросить токен"
                onClick={() => {
                  setLocalToken("");
                  setToken("");
                  setConsoleOk(false);
                  onRefresh();
                }}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                size="sm"
                className="h-9"
                onClick={() => {
                  setToken(token);
                  setAgentKey(agentKey);
                  setConsoleOk(token.trim().length > 0);
                  setAgentOk(
                    agentKey.trim().startsWith("key_") || agentKey.trim().startsWith("crsr_"),
                  );
                  onSignIn(token.trim());
                }}
              >
                Войти
              </Button>
            </div>
            <Input
              type="password"
              value={agentKey}
              onChange={(e) => setLocalAgentKey(e.target.value)}
              placeholder="CURSOR_API_KEY (key_…) — отдельно от Bearer консоли"
              className="h-9 border-border bg-background font-mono text-xs"
            />
          </div>
        </div>
      )}
    </header>
  );
}
