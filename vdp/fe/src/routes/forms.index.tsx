import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/ved/AppShell";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { listForms } from "@/lib/api/forms";
import { mapCoreFormToPaymentForm } from "@/lib/api/mappers";
import { useAuth } from "@/lib/auth/session";
import { appActionsFor } from "@/lib/ved/app-actions";
import { money, dateTime } from "@/lib/ved/format";
import { roleTitle } from "@/lib/ved/roles";
import { STATUS_FILTERS, statusMeta } from "@/lib/ved/statuses";

export const Route = createFileRoute("/forms/")({
  head: () => ({
    meta: [{ title: "Реестр заявок — Viletech ВЭД" }],
  }),
  component: FormsList,
});

function FormsList() {
  const { role, displayName } = useAuth();
  const [filter, setFilter] = useState("all");
  const [queryText, setQueryText] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  const query = useQuery({ queryKey: ["forms"], queryFn: listForms });
  const forms = useMemo(
    () => (query.data ?? []).map((f) => mapCoreFormToPaymentForm(f, displayName)),
    [query.data, displayName],
  );

  const rows = useMemo(() => {
    const preset = STATUS_FILTERS.find((f) => f.value === filter);
    return forms.filter((form) => {
      if (preset && preset.statuses.length > 0 && !preset.statuses.includes(form.status)) return false;
      if (onlyMine && appActionsFor(role ?? "user", form.status).length === 0) return false;
      if (queryText) {
        const hay = `${form.number} ${form.id} ${form.invoiceNumber} ${form.status}`;
        if (!hay.toLowerCase().includes(queryText.toLowerCase())) return false;
      }
      return true;
    });
  }, [forms, filter, onlyMine, queryText, role]);

  const hideOwner = role === "provider";

  return (
    <AppShell title="Реестр платёжных заявок" subtitle={`${role ? roleTitle(role) : "—"} · ${forms.length} с core`}>
      {query.isLoading && (
        <div className="panel animate-pulse p-6 text-sm text-muted-foreground">Загрузка реестра…</div>
      )}
      {query.isError && <p className="text-sm text-destructive">Ошибка загрузки списка.</p>}

      <div className="panel mt-0 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Поиск: номер, id, статус"
            className="field max-w-xs"
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field max-w-[200px] text-sm">
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Только мои действия
          </label>
          <Link
            to="/forms/new"
            className="ml-auto rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground"
          >
            Новая заявка
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Номер</th>
                <th className="px-2 py-2 font-medium">Статус</th>
                <th className="px-2 py-2 font-medium">Направление</th>
                <th className="px-2 py-2 font-medium">Сумма</th>
                {!hideOwner && <th className="px-2 py-2 font-medium">Клиент</th>}
                <th className="px-2 py-2 font-medium">Обновлена</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((form) => (
                <tr key={form.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-2 py-3">
                    <Link
                      to="/forms/$id"
                      params={{ id: form.id }}
                      className="font-mono text-xs font-semibold hover:underline"
                    >
                      {form.number}
                    </Link>
                    <p className="font-mono text-[10px] text-muted-foreground">{statusMeta(form.status).stage}</p>
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={form.status} />
                  </td>
                  <td className="px-2 py-3">
                    <DirectionTag direction={form.direction} />
                  </td>
                  <td className="px-2 py-3 font-mono text-xs">{money(form.amountMinor, form.currency)}</td>
                  {!hideOwner && <td className="px-2 py-3 text-xs">{form.ownerName}</td>}
                  <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground">{dateTime(form.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!query.isLoading && rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Нет заявок по фильтру.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
