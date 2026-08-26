import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { actionsFor } from "@/lib/ved/actions";
import { money } from "@/lib/ved/format";
import { cpById, orgById } from "@/lib/ved/mock";
import { roleTitle } from "@/lib/ved/roles";
import { STATUS_FILTERS, statusMeta } from "@/lib/ved/statuses";
import { useVed, visibleForms } from "@/lib/ved/store";
import { dateTime } from "@/lib/ved/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/forms/")({
  head: () => ({
    meta: [
      { title: "Реестр платёжных заявок — Viletech ВЭД" },
      { name: "description", content: "Реестр заявок ВЭД с фильтрами по стадии, направлению и очередям роли: комплаенс, договор, поручение, платёж, отгрузка." },
      { property: "og:title", content: "Реестр платёжных заявок — Viletech ВЭД" },
      { property: "og:description", content: "Фильтры по стадиям жизненного цикла, массовые действия и очереди по роли." },
    ],
  }),
  component: FormsList,
});

function FormsList() {
  const { forms, session, applyBulk } = useVed();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const role = session?.role ?? "user";
  const scoped = visibleForms(forms, role, session?.name);

  const rows = useMemo(() => {
    const preset = STATUS_FILTERS.find((f) => f.value === filter);
    return scoped.filter((form) => {
      if (preset && preset.statuses.length > 0 && !preset.statuses.includes(form.status)) return false;
      if (onlyMine && actionsFor(role, form.status).length === 0) return false;
      if (query) {
        const hay = `${form.number} ${form.invoiceNumber} ${form.ownerName} ${cpById(form.counterpartyId)?.name ?? ""} ${orgById(form.organizationId)?.name ?? ""}`;
        if (!hay.toLowerCase().includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [scoped, filter, onlyMine, query, role]);

  const bulkActions = useMemo(() => {
    const chosen = rows.filter((f) => selected.includes(f.id));
    if (chosen.length === 0) return [];
    const first = actionsFor(role, chosen[0]!.status);
    return first.filter((a) => chosen.every((f) => actionsFor(role, f.status).some((x) => x.id === a.id)));
  }, [rows, selected, role]);

  const counters = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((f) => {
      const stage = statusMeta(f.status).stage;
      map.set(stage, (map.get(stage) ?? 0) + 1);
    });
    return map;
  }, [scoped]);

  return (
    <DemoAppShell title="Реестр платёжных заявок" subtitle={`${roleTitle(role)} · видимых заявок: ${scoped.length}`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Требуют моего действия", value: scoped.filter((f) => actionsFor(role, f.status).length > 0).length },
          { label: "На комплаенсе", value: (counters.get("organization_verification") ?? 0) + (counters.get("form_verification") ?? 0) },
          { label: "В платеже", value: counters.get("payment") ?? 0 },
          { label: "Закрыто", value: counters.get("completed") ?? 0 },
        ].map((card) => (
          <div key={card.label} className="panel p-4">
            <p className="label-caps">{card.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: номер, инвойс, контрагент, клиент"
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
          <span className="ml-auto font-mono text-xs text-muted-foreground">{rows.length} строк</span>
        </div>

        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted p-2">
            <span className="text-xs font-semibold">Выбрано: {selected.length}</span>
            {bulkActions.length === 0 && <span className="text-xs text-muted-foreground">Нет общих действий для выбранных статусов</span>}
            {bulkActions
              .filter((a) => !a.requiresFile)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    applyBulk(selected, a, a.requiresReason ? "Массовое действие из реестра" : undefined);
                    setSelected([]);
                  }}
                  className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  {a.label}
                </button>
              ))}
            <button type="button" onClick={() => setSelected([])} className="text-xs text-muted-foreground">
              Снять выбор
            </button>
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-8 py-2"></th>
                <th className="label-caps py-2 pr-4">Заявка</th>
                <th className="label-caps py-2 pr-4">Статус</th>
                <th className="label-caps py-2 pr-4">Контрагент</th>
                <th className="label-caps py-2 pr-4 text-right">Сумма</th>
                {role !== "provider" && <th className="label-caps py-2 pr-4">Клиент</th>}
                <th className="label-caps py-2 pr-4">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((form) => (
                <tr key={form.id} className="border-b border-border/60 hover:bg-muted/60">
                  <td className="py-2 pr-4 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.includes(form.id)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, form.id] : prev.filter((id) => id !== form.id)))
                      }
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Link to="/demo/forms/$id" params={{ id: form.id }} className="flex items-center gap-2 font-mono text-xs font-semibold hover:underline">
                      <DirectionTag direction={form.direction} />
                      {form.number}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">{orgById(form.organizationId)?.name}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={form.status} />
                  </td>
                  <td className="py-2 pr-4">
                    <span className="block max-w-[180px] truncate text-xs">{cpById(form.counterpartyId)?.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{cpById(form.counterpartyId)?.countryCode}</span>
                  </td>
                  <td className={cn("py-2 pr-4 text-right font-mono text-xs font-semibold")}>{money(form.amountMinor, form.currency)}</td>
                  {role !== "provider" && <td className="py-2 pr-4 text-xs">{form.ownerName}</td>}
                  <td className="py-2 pr-4 font-mono text-[11px] text-muted-foreground">{dateTime(form.updatedAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Нет заявок под текущий фильтр
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DemoAppShell>
  );
}
