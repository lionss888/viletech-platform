import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { VedFormLink, VedLink } from "@/components/ved/VedLink";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { actionsFor } from "@/lib/ved/actions";
import { isComplianceRole, subjectState } from "@/lib/ved/compliance";
import { workTotalsByCurrency } from "@/lib/ved/dashboard-totals";
import { money, relative } from "@/lib/ved/format";
import { daysIdle, systemStats } from "@/lib/ved/health";
import { SYSTEM_INCIDENTS, SYSTEM_SERVICES } from "@/lib/ved/reference";
import { useVedPaths } from "@/lib/ved/ved-paths";
import { roleTitle } from "@/lib/ved/roles";
import { STAGES, statusMeta } from "@/lib/ved/statuses";
import { cpByIdFrom, usePlatformStore, visibleForms } from "@/lib/ved/platform-store";
import type { VedRole } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const ROLE_FOCUS: Record<VedRole, string> = {
  user: "Ваши сделки, документы к загрузке и статусы платежей.",
  internal_compliance_officer: "Проверка организаций и заявок перед запуском сделки.",
  compliance_officer: "Внешняя проверка заявок и подтверждение условий сделки.",
  manager: "Договоры, поручения, платежи и отгрузка по всем сделкам.",
  provider: "Сделки, переданные в исполнение платежа.",
  root: "Состояние системы, критичные ошибки, нагрузка и эффективность команды.",
};

const STATE = {
  up: { text: "Работает", cls: "bg-done-soft text-done" },
  degraded: { text: "Деградация", cls: "bg-wait-soft text-wait" },
  down: { text: "Недоступен", cls: "bg-return-soft text-return" },
};

export function DashboardPage() {
  const { session } = usePlatformStore();
  const role = session?.role ?? "user";
  return role === "root" ? <RootDashboard /> : <RoleDashboard />;
}

function RootDashboard() {
  const { forms, users } = usePlatformStore();
  const paths = useVedPaths();
  const stats = useMemo(() => systemStats(forms), [forms]);

  const critical = SYSTEM_INCIDENTS.filter((i) => i.severity === "critical");
  const healthy = SYSTEM_SERVICES.filter((s) => s.state === "up").length;
  const blocked = users.filter((u) => u.blocked).length;

  const cards = [
    { label: "Работоспособность системы", value: `${healthy}/${SYSTEM_SERVICES.length} сервисов`, to: null },
    { label: "Критичные ошибки", value: String(critical.length), to: null },
    { label: "Заявок в работе", value: String(stats.active), to: paths.forms, search: {} },
    { label: "Зависшие заявки", value: String(stats.stuck.length), to: paths.forms, search: { stuck: true } },
  ] as const;

  const people = [
    { label: "Самый активный менеджер", value: stats.topManager?.name ?? "—", note: stats.topManager ? `${stats.topManager.count} заявок` : "" },
    {
      label: "Самый дорогой клиент",
      value: stats.topClient?.name ?? "—",
      note: stats.topClient ? money(stats.topClient.sum, "USD") : "",
    },
    { label: "Лучший сотрудник", value: stats.bestEmployee?.name ?? "—", note: stats.bestEmployee ? `${stats.bestEmployee.count} закрытых сделок` : "" },
    { label: "Требует внимания", value: stats.worstEmployee?.name ?? "—", note: stats.worstEmployee ? `${stats.worstEmployee.count} зависших заявок` : "" },
  ];

  return (
    <VedAppShell title="Рабочий стол · Суперадмин" subtitle={ROLE_FOCUS.root}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) =>
          card.to ? (
            <Link key={card.label} to={card.to as "/forms"} search={card.search} className="panel block p-4 transition-colors hover:border-accent">
              <p className="label-caps">{card.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{card.value}</p>
            </Link>
          ) : (
            <div key={card.label} className="panel p-4">
              <p className="label-caps">{card.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{card.value}</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <VedLink segment="/admin" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Пользователи и роли
        </VedLink>
        <VedLink segment="/testing" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
          Проверка сценариев
        </VedLink>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="panel p-4">
          <h2 className="text-sm font-semibold">Состояние сервисов</h2>
          <ul className="mt-3 divide-y divide-border">
            {SYSTEM_SERVICES.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 basis-32 truncate text-sm">{s.name}</span>
                <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">{s.latencyMs} мс</span>
                <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">{s.uptime}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", STATE[s.state].cls)}>
                  {STATE[s.state].text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-semibold">Ошибки и учётные записи</h2>
          <ul className="mt-3 divide-y divide-border">
            {SYSTEM_INCIDENTS.map((i) => (
              <li key={i.id} className="py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                      i.severity === "critical" ? "bg-return-soft text-return" : "bg-wait-soft text-wait",
                    )}
                  >
                    {i.severity === "critical" ? "Критично" : "Предупреждение"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {i.account} · {i.at}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {people.map((p) => (
          <div key={p.label} className="panel p-4">
            <p className="label-caps">{p.label}</p>
            <p className="mt-1 truncate text-sm font-semibold">{p.value}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{p.note}</p>
          </div>
        ))}
      </div>

      <section className="panel mt-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Зависшие заявки</h2>
          <VedLink segment="/forms" search={{ stuck: true }} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Реестр →
          </VedLink>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {stats.stuck.slice(0, 7).map((form) => (
            <li key={form.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <VedFormLink id={form.id} className="font-mono text-xs font-semibold hover:underline">
                {form.number}
              </VedFormLink>
              <StatusBadge status={form.status} />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{form.managerName ?? "менеджер не назначен"}</span>
              <span className="font-mono text-xs">{money(form.amountMinor, form.currency)}</span>
              <span className="font-mono text-[11px] text-return">{daysIdle(form)} дн. без движения</span>
            </li>
          ))}
          {stats.stuck.length === 0 && <li className="py-2 text-sm text-muted-foreground">Все заявки в движении.</li>}
        </ul>
      </section>

      <p className="mt-3 text-[11px] text-muted-foreground">
        <VedLink segment="/admin" className="font-semibold hover:underline">
          Учётных записей: {users.length}
        </VedLink>
        {" · "}
        заблокировано: {blocked} · сделок всего: {stats.total}
      </p>
    </VedAppShell>
  );
}

function RoleDashboard() {
  const { forms, session, organizations, counterparties } = usePlatformStore();
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

  const totals = useMemo(() => workTotalsByCurrency(scoped), [scoped]);
  const primaryTotal = totals.byCurrency[0];
  const secondaryTotals = totals.byCurrency.slice(1);

  const compliance = isComplianceRole(role);
  const orgsPending = organizations.filter((o) => !subjectState(o.status).ok).length;
  const orgsCleared = organizations.length - orgsPending;

  return (
    <VedAppShell title={`Рабочий стол · ${roleTitle(role)}`} subtitle={ROLE_FOCUS[role]}>
      {compliance && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <VedLink segment="/forms" search={{ mine: true }} className="panel block p-4 transition-colors hover:border-accent">
            <p className="label-caps">Входящие заявки</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{todo.length}</p>
          </VedLink>
          <VedLink segment="/organizations" className="panel block p-4 transition-colors hover:border-accent">
            <p className="label-caps">Организации требуют проверки</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{orgsPending}</p>
          </VedLink>
          <VedLink segment="/organizations" className="panel block p-4 transition-colors hover:border-accent">
            <p className="label-caps">Организации прошли проверку</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{orgsCleared}</p>
          </VedLink>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <VedLink segment="/forms" search={{ mine: true }} className="panel block p-4 transition-colors hover:border-accent">
          <p className="label-caps">Требуют вашего действия</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{todo.length}</p>
        </VedLink>
        <VedLink segment="/forms" search={{}} className="panel block p-4 transition-colors hover:border-accent">
          <p className="label-caps">Сделок в работе / закрыто</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {totals.active} / {byStage.get("completed") ?? 0}
          </p>
        </VedLink>
        <VedLink segment="/forms" search={{}} className="panel block p-4 transition-colors hover:border-accent">
          <p className="label-caps">Сумма в работе</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {primaryTotal ? money(primaryTotal.sumMinor, primaryTotal.currency) : money(0, "USD")}
          </p>
          {secondaryTotals.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {secondaryTotals.map((row) => (
                <li key={row.currency} className="font-mono text-[11px] text-muted-foreground">
                  {money(row.sumMinor, row.currency)}
                </li>
              ))}
            </ul>
          )}
        </VedLink>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">

        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Задачи для вас</h2>
            <VedLink segment="/forms" search={{ mine: true }} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Все заявки →
            </VedLink>
          </div>

          {todo.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Сейчас нет задач, требующих вашего участия.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {todo.slice(0, 7).map((form) => (
                <li key={form.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <VedFormLink id={form.id} className="shrink-0 font-mono text-xs font-semibold hover:underline">
                    {form.number}
                  </VedFormLink>
                  <span className="shrink-0">
                    <StatusBadge status={form.status} />
                  </span>
                  <span className="min-w-0 flex-1 basis-28 truncate text-xs text-muted-foreground">
                    {cpByIdFrom(counterparties, form.counterpartyId)?.name ?? "—"}
                  </span>
                  <span className="shrink-0 font-mono text-xs whitespace-nowrap">{money(form.amountMinor, form.currency)}</span>
                  <span className="basis-full text-[11px] text-muted-foreground sm:basis-auto sm:shrink-0 sm:truncate">
                    {actionsFor(role, form.status)[0]?.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-semibold">Сделки по этапам</h2>

          <ul className="mt-3 space-y-1">
            {STAGES.filter((stage) => (byStage.get(stage.id) ?? 0) > 0).map((stage) => (
              <li key={stage.id}>
                <VedLink
                  segment="/forms"
                  search={{ stage: stage.id }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-1 text-sm transition-colors hover:bg-muted"
                >
                  <span className="truncate text-muted-foreground">{stage.label}</span>
                  <span className="font-mono text-xs font-semibold">{byStage.get(stage.id)}</span>
                </VedLink>
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
            <li key={form.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 sm:flex sm:flex-wrap">
              <VedFormLink id={form.id} className="font-mono text-xs font-semibold hover:underline">
                {form.number}
              </VedFormLink>
              <span className="justify-self-end sm:order-none">
                <StatusBadge status={form.status} />
              </span>
              <span className="col-span-2 min-w-0 truncate text-xs text-muted-foreground sm:order-none sm:col-span-1 sm:flex-1">
                {cpByIdFrom(counterparties, form.counterpartyId)?.name ?? "—"}
              </span>
              <span className="font-mono text-xs whitespace-nowrap">{money(form.amountMinor, form.currency)}</span>
              <span className="justify-self-end text-[11px] whitespace-nowrap text-muted-foreground">{relative(form.updatedAt)}</span>
            </li>
          ))}
          {recent.length === 0 && <li className="py-2 text-sm text-muted-foreground">Нет данных.</li>}
        </ul>
      </section>
    </VedAppShell>
  );
}
