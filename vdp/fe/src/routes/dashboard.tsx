import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { AppShell } from "@/components/ved/AppShell";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { listForms } from "@/lib/api/forms";
import { mapCoreFormToPaymentForm } from "@/lib/api/mappers";
import { useAuth } from "@/lib/auth/session";
import { appActionsFor } from "@/lib/ved/app-actions";
import { money, relative } from "@/lib/ved/format";
import { roleTitle } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Рабочий стол — Viletech ВЭД" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { role, displayName } = useAuth();
  const query = useQuery({
    queryKey: ["forms"],
    queryFn: listForms,
  });

  const forms = useMemo(
    () => (query.data ?? []).map((f) => mapCoreFormToPaymentForm(f, displayName)),
    [query.data, displayName],
  );

  const todo = useMemo(
    () => forms.filter((f) => appActionsFor(role ?? "user", f.status).length > 0),
    [forms, role],
  );

  const recent = useMemo(
    () => [...forms].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [forms],
  );

  return (
    <AppShell title="Рабочий стол" subtitle={`${role ? roleTitle(role) : "—"} · данные с vdp/core`}>
      {query.isLoading && <p className="text-sm text-muted-foreground">Загрузка заявок…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">Не удалось загрузить заявки. Проверьте core и сессию.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="label-caps">Требуют действия</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{todo.length}</p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">Всего видимых</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{forms.length}</p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">Реестр</p>
          <Link to="/forms" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
            Открыть список
          </Link>
        </div>
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Недавние обновления</p>
        <ul className="mt-3 divide-y divide-border">
          {recent.map((form) => (
            <li key={form.id} className="flex flex-wrap items-center gap-3 py-3">
              <Link to="/forms/$id" params={{ id: form.id }} className="font-mono text-xs font-semibold hover:underline">
                {form.number}
              </Link>
              <StatusBadge status={form.status} />
              <span className="ml-auto font-mono text-xs">{money(form.amountMinor, form.currency)}</span>
              <span className="text-[11px] text-muted-foreground">{relative(form.updatedAt)}</span>
            </li>
          ))}
          {!query.isLoading && recent.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Заявок пока нет — создайте первую.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
