import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { actionsFor } from "@/lib/ved/actions";
import { money, relative } from "@/lib/ved/format";
import { cpById } from "@/lib/ved/mock";
import { roleTitle } from "@/lib/ved/roles";
import { STAGES, statusMeta } from "@/lib/ved/statuses";
import { useVed, visibleForms } from "@/lib/ved/store";
import type { VedRole } from "@/lib/ved/types";

export const Route = createFileRoute("/demo/dashboard")({
  head: () => ({
    meta: [
      { title: "Рабочий стол — Viletech ВЭД" },
      { name: "description", content: "Стартовый экран роли: задачи, требующие действия, сделки в работе, платежи и отгрузки." },
      { property: "og:title", content: "Рабочий стол — Viletech ВЭД" },
      { property: "og:description", content: "Задачи роли, сделки в работе и последние обновления." },
    ],
  }),
  component: DashboardPage,
});

const ROLE_FOCUS: Record<VedRole, string> = {
  user: "Ваши сделки, документы к загрузке и статусы платежей.",
  internal_compliance_officer: "Проверка организаций и заявок перед запуском сделки.",
  compliance_officer: "Внешняя проверка заявок и подтверждение условий сделки.",
  manager: "Договоры, поручения, платежи и отгрузка по всем сделкам.",
  provider: "Сделки, переданные в исполнение платежа.",
  root: "Полный контур: сделки, пользователи, справочники.",
};

function DashboardPage() {
  const { forms, session } = useVed();
  const role = session?.role ?? "user";
  const scoped = visibleForms(forms, role, session?.name);

  const todo = useMemo(() => scoped.filter((f) => actionsFor(role, f.status).length > 0), [scoped, role]);

  const byStage = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((f) => {
      const stage = statusMeta(f.status).stage;
      map.set(stage, (map.get(stage) ?? 0) + 1);
    });
    return map;
  }, [scoped]);

  const recent = useMemo(
    () => [...scoped].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [scoped],
  );

  const totals = useMemo(() => {
    const active = scoped.filter((f) => !f.status.startsWith("canceled") && f.status !== "completed");
    const sum = active.reduce((acc, f) => acc + f.amountMinor, 0);
    return { active: active.length, sum, currency: active[0]?.currency ?? "USD" };
  }, [scoped]);

  return (
    <DemoAppShell title={`Рабочий стол · ${roleTitle(role)}`} subtitle={ROLE_FOCUS[role]}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Требуют вашего действия", value: String(todo.length) },
          { label: "Сделок в работе", value: String(totals.active) },
          { label: "Сумма в работе", value: money(totals.sum, totals.currency) },
          { label: "Закрыто", value: String(byStage.get("completed") ?? 0) },
        ].map((card) => (
          <div key={card.label} className="panel p-4">
            <p className="label-caps">{card.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Задачи для вас</h2>
            <Link to="/demo/forms" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Все заявки →
            </Link>
          </div>

          {todo.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Сейчас нет задач, требующих вашего участия.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {todo.slice(0, 7).map((form) => (
                <li key={form.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Link
                    to="/demo/forms/$id"
                    params={{ id: form.id }}
                    className="font-mono text-xs font-semibold hover:underline"
                  >
                    {form.number}
                  </Link>
                  <StatusBadge status={form.status} />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {cpById(form.counterpartyId)?.name ?? "—"}
                  </span>
                  <span className="font-mono text-xs">{money(form.amountMinor, form.currency)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {actionsFor(role, form.status)[0]?.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-semibold">Сделки по этапам</h2>
          <ul className="mt-3 space-y-2">
            {STAGES.filter((stage) => (byStage.get(stage.id) ?? 0) > 0).map((stage) => (
              <li key={stage.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{stage.label}</span>
                <span className="font-mono text-xs font-semibold">{byStage.get(stage.id)}</span>
              </li>
            ))}
            {scoped.length === 0 && <li className="text-sm text-muted-foreground">Сделок пока нет.</li>}
          </ul>
        </section>
      </div>

      <section className="panel mt-4 p-4">
        <h2 className="text-sm font-semibold">Последние обновления</h2>
        <ul className="mt-3 divide-y divide-border">
          {recent.map((form) => (
            <li key={form.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Link to="/demo/forms/$id" params={{ id: form.id }} className="font-mono text-xs font-semibold hover:underline">
                {form.number}
              </Link>
              <StatusBadge status={form.status} />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {cpById(form.counterpartyId)?.name ?? "—"}
              </span>
              <span className="font-mono text-xs">{money(form.amountMinor, form.currency)}</span>
              <span className="text-[11px] text-muted-foreground">{relative(form.updatedAt)}</span>
            </li>
          ))}
          {recent.length === 0 && <li className="py-2 text-sm text-muted-foreground">Нет данных.</li>}
        </ul>
      </section>
    </DemoAppShell>
  );
}
