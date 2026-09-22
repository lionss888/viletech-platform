import { useMemo, useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { VedFormLink } from "@/components/ved/VedLink";
import { filterAgentReportsByPeriod, listAgentReportRows } from "@/lib/ved/reference-docs-filter";
import { usePlatformStore, visibleForms } from "@/lib/ved/platform-store";
import { dateTime } from "@/lib/ved/format";

/** Agent reports already on forms; period required before Show. */
export function AgentReportsPage() {
  const { forms, session } = usePlatformStore();
  const mine = visibleForms(forms, session?.role, session?.name);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [shown, setShown] = useState(false);

  const allReports = useMemo(() => listAgentReportRows(mine), [mine]);
  const rows = useMemo(
    () => (shown ? filterAgentReportsByPeriod(allReports, appliedFrom, appliedTo) : []),
    [allReports, appliedFrom, appliedTo, shown],
  );

  function onShow() {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setShown(true);
  }

  const periodReady = Boolean(fromDate.trim() && toDate.trim());

  return (
    <VedAppShell title="Отчёты" subtitle="Сформированные отчёты агента по дате заявки">
      <div className="mb-4 flex flex-wrap items-end gap-3" data-testid="agent-reports-period">
        <label className="space-y-1 text-sm">
          <span className="label-caps block">Дата начала</span>
          <input
            type="date"
            className="field"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            data-testid="agent-reports-from"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="label-caps block">Дата конца</span>
          <input
            type="date"
            className="field"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            data-testid="agent-reports-to"
          />
        </label>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={!periodReady}
          onClick={onShow}
          data-testid="agent-reports-show"
        >
          Показать
        </button>
      </div>

      {!shown && (
        <p className="text-sm text-muted-foreground">Укажите период и нажмите «Показать».</p>
      )}

      {shown && rows.length === 0 && (
        <div className="panel max-w-lg space-y-2 p-6" data-testid="agent-reports-empty">
          <p className="text-sm font-semibold">За этот период отчётов нет</p>
          <p className="text-sm text-muted-foreground">
            В диапазоне по дате заявки нет документов вида agent_report. Отчёты формируются на карточке заявки.
          </p>
        </div>
      )}

      {shown && rows.length > 0 && (
        <ul className="panel divide-y divide-border" data-testid="agent-reports-list">
          {rows.map(({ doc, form }) => (
            <li key={`${form.id}-${doc.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  Заявка {form.number} · {dateTime(form.createdAt)}
                </p>
              </div>
              <VedFormLink id={form.id} className="text-xs font-semibold text-primary hover:underline">
                К заявке
              </VedFormLink>
            </li>
          ))}
        </ul>
      )}
    </VedAppShell>
  );
}
