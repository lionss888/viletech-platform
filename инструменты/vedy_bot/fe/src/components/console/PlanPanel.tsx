import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPlan, listPlans, putPlan, type PlanDoc, type PlanTodo } from "@/lib/api/client";
import { preparePlanForSave } from "@/lib/api/plan-normalize";
import { formatPlanPublishSummary } from "@/lib/api/publish-compose";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onPublishSummary?: (text: string) => void;
};

export function PlanPanel({ open, onOpenChange, busy, onPublishSummary }: Props) {
  const [plans, setPlans] = useState<PlanDoc[]>([]);
  const [active, setActive] = useState<PlanDoc | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    void listPlans()
      .then(async (items) => {
        setPlans(items);
        const firstId = items[0]?.id;
        if (firstId) {
          setActive(await getPlan(firstId));
          return;
        }
        setActive(null);
      })
      .catch((e) => setStatus(String((e as Error).message || e)));
  }, [open]);

  if (!open) return null;

  function updateTodo(i: number, patch: Partial<PlanTodo>) {
    if (!active) return;
    const todos = active.todos.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setActive({ ...active, todos });
  }

  function removeTodo(i: number) {
    if (!active) return;
    setActive({ ...active, todos: active.todos.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-mono text-sm font-semibold">План (.plan.md)</h2>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">
          Редактор frontmatter + todos. Автозапуск todos из консоли не выполняется.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {plans.map((p) => (
            <Button
              key={p.id || p.path}
              size="sm"
              variant={active?.id === p.id ? "default" : "outline"}
              className="font-mono text-[11px]"
              disabled={busy}
              onClick={() => {
                if (!p.id) return;
                void getPlan(p.id).then(setActive);
              }}
            >
              {p.id || p.name}
            </Button>
          ))}
        </div>
        {!active ? (
          <p className="font-mono text-xs text-muted-foreground">
            Нет планов в .cursor/plans/тгбот
          </p>
        ) : (
          <div className="space-y-3">
            <Input
              value={active.name}
              onChange={(e) => setActive({ ...active, name: e.target.value })}
              className="font-mono text-xs"
              placeholder="name"
            />
            <Textarea
              value={active.overview}
              onChange={(e) => setActive({ ...active, overview: e.target.value })}
              className="min-h-16 text-sm"
              placeholder="overview"
            />
            <div className="space-y-2">
              {(active.todos || []).map((t, i) => (
                <div
                  key={t.id || i}
                  className="flex flex-wrap items-center gap-2 rounded border border-border p-2"
                >
                  <Input
                    value={t.id}
                    onChange={(e) => updateTodo(i, { id: e.target.value })}
                    className="w-28 font-mono text-[11px]"
                    placeholder="id"
                  />
                  <Input
                    value={t.content}
                    onChange={(e) => updateTodo(i, { content: e.target.value })}
                    className="min-w-0 flex-1 font-mono text-xs"
                  />
                  <select
                    className="rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                    value={t.status}
                    onChange={(e) => updateTodo(i, { status: e.target.value })}
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => removeTodo(i)}>
                    Удалить
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setActive({
                    ...active,
                    todos: [
                      ...(active.todos || []),
                      { id: `todo-${Date.now()}`, content: "Новый шаг", status: "pending" },
                    ],
                  })
                }
              >
                Добавить todo
              </Button>
            </div>
            <Textarea
              value={active.body || ""}
              onChange={(e) => setActive({ ...active, body: e.target.value })}
              className="min-h-28 font-mono text-xs"
              placeholder="markdown body"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={busy || !active.id}
                onClick={() => {
                  if (!active.id) return;
                  const payload = preparePlanForSave(active);
                  void putPlan(active.id, payload)
                    .then((doc) => {
                      setActive(doc);
                      setStatus(doc.path ? `сохранено: ${doc.path}` : "сохранено");
                    })
                    .catch((e) => setStatus(String((e as Error).message || e)));
                }}
              >
                Сохранить
              </Button>
              {onPublishSummary && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  data-testid="publish-plan-summary"
                  onClick={() => {
                    const text = formatPlanPublishSummary({
                      name: active.name,
                      overview: active.overview,
                    });
                    if (!text.trim()) {
                      setStatus("нет name/overview для отправки");
                      return;
                    }
                    onPublishSummary(text);
                  }}
                >
                  Отправить summary в TG
                </Button>
              )}
              {active.path && (
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {active.path}
                </span>
              )}
            </div>
            {status && <p className="font-mono text-[11px] text-muted-foreground">{status}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
