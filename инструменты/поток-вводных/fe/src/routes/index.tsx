import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Composer } from "@/components/console/Composer";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { HitlPanel } from "@/components/console/HitlPanel";
import { MessageCard } from "@/components/console/MessageCard";
import { SelectionBar } from "@/components/console/SelectionBar";
import {
  consoleMessages as demoMessages,
  hitlCards as demoCards,
  type ConsoleMessage,
  type HitlCard,
} from "@/lib/console-data";
import {
  checkAuth,
  fetchCards,
  fetchThread,
  getToken,
  hitlDecide,
  isDemoMode,
  savePrompt,
  sendMessage,
  setToken,
  startAgent,
  uploadFile,
  waitAgentJob,
} from "@/lib/api/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Консоль чата — живое зеркало Telegram и разбор" },
      {
        name: "description",
        content:
          "Живая лента Telegram-чата, выделение сообщений, локальный разбор, вопросы агенту и карточки HITL.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const demo = isDemoMode();
  const [selected, setSelected] = useState<string[]>([]);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>(demo ? demoMessages : []);
  const [cards, setCards] = useState<HitlCard[]>(demo ? demoCards : []);
  const [signedIn, setSignedIn] = useState(demo);
  const [status, setStatus] = useState(demo ? "demo" : "");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (demo) {
      setMessages(demoMessages);
      setCards(demoCards);
      setSignedIn(true);
      return;
    }
    if (!getToken()) {
      setSignedIn(false);
      setStatus("нужен токен");
      return;
    }
    try {
      const [thread, hitl] = await Promise.all([fetchThread(200), fetchCards()]);
      setMessages(thread);
      setCards(hitl);
      setSignedIn(true);
      setStatus(`live · ${thread.length}`);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setSignedIn(false);
        setStatus("unauthorized");
        return;
      }
      setStatus(String(err.message || e));
    }
  }, [demo]);

  useEffect(() => {
    void refresh();
    if (demo) return;
    const id = window.setInterval(() => {
      if (getToken()) void refresh();
    }, 2000);
    return () => window.clearInterval(id);
  }, [demo, refresh]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const pending = cards.filter((c) => c.status === "awaiting_approve").length;

  const groups = useMemo(
    () =>
      messages.reduce<{ date: string; items: ConsoleMessage[] }[]>((acc, m) => {
        const date = new Date(m.timestamp).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          timeZone: "Europe/Moscow",
        });
        const last = acc[acc.length - 1];
        if (last && last.date === date) last.items.push(m);
        else acc.push({ date, items: [m] });
        return acc;
      }, []),
    [messages],
  );

  async function runAgent(
    mode: "analyze_selected" | "analyze_chat" | "ask_agent",
    ids: string[],
    prompt: string,
  ) {
    setBusy(true);
    setStatus(`агент: ${mode}`);
    try {
      const job = await startAgent({ mode, messageIds: ids, prompt });
      const done = await waitAgentJob(job.id);
      setStatus(done.error ? done.error : done.status);
      await refresh();
    } catch (e) {
      setStatus(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <ConsoleHeader
        messageCount={messages.length}
        selectedCount={selected.length}
        pendingCards={pending}
        signedIn={signedIn}
        statusText={status}
        onOpenCards={() => setCardsOpen(true)}
        onRefresh={() => void refresh()}
        onSignIn={async (token) => {
          setToken(token);
          const ok = demo ? true : await checkAuth().catch(() => false);
          setSignedIn(ok);
          setStatus(ok ? "ok" : "неверный токен");
          if (ok) await refresh();
        }}
      />

      <main className="console-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Лента чата · зеркало Telegram
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 font-mono text-[11px] text-muted-foreground"
                onClick={() => setSelected(messages.map((m) => m.id))}
              >
                Выбрать всё
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 font-mono text-[11px] text-muted-foreground"
                onClick={() => setSelected([])}
              >
                Снять
              </Button>
            </div>
          </div>

          {groups.map((group) => (
            <section key={group.date} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {group.date}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2.5">
                {group.items.map((m) => (
                  <MessageCard
                    key={m.id}
                    message={m}
                    selected={selected.includes(m.id)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="shrink-0 z-20">
        <SelectionBar
          count={selected.length}
          busy={busy}
          onClear={() => setSelected([])}
          onAnalyzeSelected={(p) => void runAgent("analyze_selected", selected, p)}
          onAnalyzeChat={() => void runAgent("analyze_chat", [], "")}
          onAskAgent={(p) => void runAgent("ask_agent", selected, p)}
        />
        <Composer
          busy={busy}
          onSavePrompt={async (text) => {
            try {
              const res = await savePrompt(text);
              setStatus(`промпт: ${res.path}`);
            } catch (e) {
              setStatus(String((e as Error).message || e));
            }
          }}
          onSend={async ({ text, asIntake, mirrorToTg, files }) => {
            setBusy(true);
            try {
              const ids: string[] = [];
              for (const f of files) {
                const att = await uploadFile(f);
                ids.push(att.id);
              }
              await sendMessage({
                text,
                asIntake,
                mirrorToTg,
                attachmentIds: ids,
              });
              setStatus("отправлено");
              await refresh();
            } catch (e) {
              setStatus(String((e as Error).message || e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>

      <HitlPanel
        open={cardsOpen}
        onOpenChange={setCardsOpen}
        cards={cards}
        busy={busy}
        onApprove={async (id) => {
          setBusy(true);
          try {
            await hitlDecide(id, true);
            await refresh();
          } catch (e) {
            setStatus(String((e as Error).message || e));
          } finally {
            setBusy(false);
          }
        }}
        onReject={async (id) => {
          setBusy(true);
          try {
            await hitlDecide(id, false);
            await refresh();
          } catch (e) {
            setStatus(String((e as Error).message || e));
          } finally {
            setBusy(false);
          }
        }}
        onAskAgent={(_id, text) => void runAgent("ask_agent", [], text)}
      />
    </div>
  );
}
