import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { actionsFor } from "@/lib/ved/actions";
import { money } from "@/lib/ved/format";
import { daysIdle, stuckForms } from "@/lib/ved/health";
import { cpById, orgById } from "@/lib/ved/mock";
import { roleTitle } from "@/lib/ved/roles";
import { STAGES, STATUS_FILTERS, statusMeta } from "@/lib/ved/statuses";
import { useVed, visibleForms } from "@/lib/ved/store";
import { dateTime } from "@/lib/ved/format";
import { cn } from "@/lib/utils";
import type { FormAction } from "@/lib/ved/types";

type FormsSearch = {
  filter?: string | undefined;
  stage?: string | undefined;
  mine?: boolean | undefined;
  stuck?: boolean | undefined;
  q?: string | undefined;
};

export const Route = createFileRoute("/demo/forms/")({
  validateSearch: (search: Record<string, unknown>): FormsSearch => ({
    filter: typeof search["filter"] === "string" ? search["filter"] : undefined,
    stage: typeof search["stage"] === "string" ? search["stage"] : undefined,
    mine: search["mine"] === true || search["mine"] === "true" ? true : undefined,
    stuck: search["stuck"] === true || search["stuck"] === "true" ? true : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Реестр платёжных заявок — ВЭД от Вилетех" },
      { name: "description", content: "Реестр заявок ВЭД с фильтрами по стадии, направлению и очередям роли: комплаенс, договор, поручение, платёж, отгрузка." },
      { property: "og:title", content: "Реестр платёжных заявок — ВЭД от Вилетех" },
      { property: "og:description", content: "Фильтры по стадиям жизненного цикла, массовые действия и очереди по роли." },
    ],
  }),
  component: FormsList,
});

function FormsList() {
  const { forms, session, applyBulk } = useVed();
  const preset = Route.useSearch();
  const [filter, setFilter] = useState(preset.filter ?? "all");
  const [query, setQuery] = useState(preset.q ?? "");
  const [onlyMine, setOnlyMine] = useState(preset.mine ?? false);
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyStuck, setOnlyStuck] = useState(preset.stuck ?? false);
  const [stageFilter, setStageFilter] = useState(preset.stage ?? "");
  const [bulkPending, setBulkPending] = useState<FormAction | null>(null);
  const [bulkReason, setBulkReason] = useState("");

  const role = session?.role ?? "user";
  const scoped = visibleForms(forms, role, session?.name);

  const stuck = useMemo(() => stuckForms(scoped), [scoped]);
  const stuckIds = useMemo(() => new Set(stuck.map((f) => f.id)), [stuck]);

  const rows = useMemo(() => {
    const statusPreset = STATUS_FILTERS.find((f) => f.value === filter);
    return scoped.filter((form) => {
      if (statusPreset && statusPreset.statuses.length > 0 && !statusPreset.statuses.includes(form.status)) return false;
      if (stageFilter && statusMeta(form.status).stage !== stageFilter) return false;
      if (onlyMine && actionsFor(role, form.status).length === 0) return false;
      if (onlyStuck && !stuckIds.has(form.id)) return false;
      if (query) {
        const hay = `${form.number} ${form.invoiceNumber} ${form.ownerName} ${cpById(form.counterpartyId)?.name ?? ""} ${orgById(form.organizationId)?.name ?? ""}`;
        if (!hay.toLowerCase().includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [scoped, filter, stageFilter, onlyMine, onlyStuck, stuckIds, query, role]);

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
          role === "root"
            ? { label: "Зависшие заявки", value: stuck.length }
            : { label: "Требуют моего действия", value: scoped.filter((f) => actionsFor(role, f.status).length > 0).length },
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
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <Link
            to="/demo/forms/new"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Создать заявку
          </Link>
          <button
            type="button"
            onClick={() => downloadCsv(formsToCsv(rows), "zayavki.csv")}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
          >
            Скачать заявки ({rows.length})
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => downloadCsv(formsToCsv(rows.filter((f) => selected.includes(f.id))), "zayavki-vybrannye.csv")}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Скачать выбранные ({selected.length})
          </button>
        </div>
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
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="field max-w-[180px] text-sm">
            <option value="">Все этапы</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                Этап: {s.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Только мои действия
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input type="checkbox" checked={onlyStuck} onChange={(e) => setOnlyStuck(e.target.checked)} />
            Только зависшие
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
                    setBulkReason("");
                    setBulkPending(a);
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
                {role === "root" && <th className="label-caps py-2 pr-4 text-right">Простой</th>}
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
                  {role === "root" && (
                    <td className={cn("py-2 pr-4 text-right font-mono text-[11px]", stuckIds.has(form.id) ? "text-return" : "text-muted-foreground")}>
                      {daysIdle(form)} дн.
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Нет заявок под текущий фильтр
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={bulkPending !== null}
        onOpenChange={(v) => !v && setBulkPending(null)}
        title={bulkPending?.label ?? ""}
        description={`Действие будет применено к ${selected.length} заявкам.`}
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setBulkPending(null)}>
              Отмена
            </ModalButton>
            <ModalButton
              variant={bulkPending?.tone === "danger" ? "danger" : "primary"}
              disabled={!!bulkPending?.requiresReason && bulkReason.trim().length < 3}
              onClick={() => {
                if (!bulkPending) return;
                applyBulk(selected, bulkPending, bulkPending.requiresReason ? bulkReason : undefined);
                setSelected([]);
                setBulkPending(null);
              }}
            >
              Подтвердить
            </ModalButton>
          </>
        }
      >
        {bulkPending?.requiresReason && (
          <label className="block">
            <span className="label-caps">Причина</span>
            <textarea
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              rows={3}
              placeholder="Причина массового действия"
              className="field mt-1 resize-none"
            />
          </label>
        )}
      </Modal>
    </DemoAppShell>
  );
}

function formsToCsv(rows: ReturnType<typeof visibleForms>): string {
  const escape = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    "Номер",
    "Направление",
    "Статус",
    "Стадия",
    "Контрагент",
    "Страна",
    "Клиент",
    "Организация",
    "Инвойс",
    "Сумма",
    "Валюта",
    "Обновлено",
  ];
  const lines = rows.map((form) =>
    [
      form.number,
      form.direction,
      statusMeta(form.status).label,
      statusMeta(form.status).stage,
      cpById(form.counterpartyId)?.name ?? "",
      cpById(form.counterpartyId)?.countryCode ?? "",
      form.ownerName,
      orgById(form.organizationId)?.name ?? "",
      form.invoiceNumber,
      (form.amountMinor / 100).toFixed(2),
      form.currency,
      dateTime(form.updatedAt),
    ]
      .map((v) => escape(String(v ?? "")))
      .join(";"),
  );
  return [header.map(escape).join(";"), ...lines].join("\n");
}

function downloadCsv(text: string, name: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
