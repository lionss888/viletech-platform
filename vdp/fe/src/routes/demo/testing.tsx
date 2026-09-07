import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VedFormLink } from "@/components/ved/VedLink";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { smokeCreateBankForm } from "@/lib/api/bank";
import {
  fetchScenarioCatalog,
  fetchScenarioPolicy,
  listScenarioRuns,
  startScenarioRuns,
  type ScenarioCatalogItem,
  type ScenarioPolicy,
  type ScenarioRun,
} from "@/lib/api/scenarios";
import { ApiError } from "@/lib/api/client";
import { actionsFor } from "@/lib/ved/actions";
import { APP_SEED_ACCOUNTS } from "@/lib/ved/app-seed-accounts";
import { BANK_ORG_ID } from "@/lib/ved/bank-channel";
import { money } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { ROLES } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/testing")({
  head: () => ({
    meta: [
      {
        title: "Тестовые данные и сценарии — ⚡ Веди ВЭД ₽",
      },
      {
        name: "description",
        content:
          "Каталог scenarioverify: запуск API-проверок для root, seed-аккаунты и Bank smoke.",
      },
    ],
  }),
  component: TestingPage,
});

export function TestingPage() {
  const { forms, users, organizations, counterparties } = usePlatformStore();
  const mode = usePlatformMode();
  const queryClient = useQueryClient();
  const isApp = mode === "app";
  const [bankBusy, setBankBusy] = useState(false);
  const [bankResult, setBankResult] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ScenarioCatalogItem[]>([]);
  const [policy, setPolicy] = useState<ScenarioPolicy | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [history, setHistory] = useState<ScenarioRun[]>([]);
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const accountRows = useMemo(() => {
    if (isApp) {
      return APP_SEED_ACCOUNTS.map((seed) => ({
        roleId: seed.role,
        title: seed.title,
        personName: seed.personName,
        email: seed.email,
        password: seed.password,
      }));
    }
    return ROLES.map((role) => ({
      roleId: role.id,
      title: role.title,
      personName: role.personName,
      email: role.seedEmail,
      password: role.seedPassword,
    }));
  }, [isApp]);

  const loadScenarioPanel = useCallback(async () => {
    if (!isApp) return;
    setCatalogError(null);
    try {
      const [cat, pol, hist] = await Promise.all([
        fetchScenarioCatalog(),
        fetchScenarioPolicy(),
        listScenarioRuns(10),
      ]);
      setCatalog(cat);
      setPolicy(pol);
      setHistory(hist);
      setSelected((prev) => {
        const next = { ...prev };
        for (const item of cat) {
          if (next[item.id] === undefined) {
            next[item.id] = item.tags.includes("smoke");
          }
        }
        return next;
      });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Не удалось загрузить каталог";
      setCatalogError(msg);
    }
  }, [isApp]);

  useEffect(() => {
    void loadScenarioPanel();
  }, [loadScenarioPanel]);

  async function simulateBankCreate() {
    setBankBusy(true);
    setBankError(null);
    setBankResult(null);
    try {
      const correlationId = `corr-${Date.now()}`;
      const form = await smokeCreateBankForm(
        {
          organization_id: BANK_ORG_ID,
          ...(counterparties[0]?.id ? { counterparty_id: counterparties[0].id } : {}),
          invoice_amount: "1500",
          currency: "USD",
          direction: "import",
          kind: "good",
          contract_number: `BANK-${Date.now()}`,
          contract_date: "2026-08-01",
          correlation_id: correlationId,
        },
        `idem-${Date.now()}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      setBankResult(
        `Создана заявка ${form.id} · channel=${form.channel} · corr=${form.correlation_id ?? correlationId}`,
      );
    } catch (e) {
      setBankError(e instanceof Error ? e.message : "Bank API error");
    } finally {
      setBankBusy(false);
    }
  }

  async function runSelectedScenarios() {
    const ids = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (ids.length === 0) {
      setRunError("Выберите хотя бы один сценарий");
      return;
    }
    setRunBusy(true);
    setRunError(null);
    setRuns([]);
    try {
      const modeHint = policy?.allows_mutating_runs ? "mutating" : "dry_run";
      const res = await startScenarioRuns({ scenario_ids: ids, mode: modeHint });
      setRuns(res.runs);
      const hist = await listScenarioRuns(10);
      setHistory(hist);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Ошибка запуска");
    } finally {
      setRunBusy(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <VedAppShell
      title="Тестовые данные и сценарии"
      subtitle="Root: каталог scenarioverify + seed-аккаунты"
    >
      {isApp && (
        <div className="panel p-4">
          <p className="label-caps">Проверка сценариев (API)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Исполнение в core (system.admin). Не браузерный автокликер. Среда:{" "}
            {policy?.environment ?? "…"} · режим по умолчанию: {policy?.default_mode ?? "…"}
            {policy && !policy.allows_mutating_runs
              ? " · мутирующие прогоны отключены (dry_run)"
              : ""}
          </p>
          {catalogError && <p className="mt-2 text-xs text-destructive">{catalogError}</p>}
          {catalog.length > 0 && (
            <ul className="mt-3 space-y-2">
              {catalog.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    id={`sc-${item.id}`}
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[item.id])}
                    onChange={(ev) =>
                      setSelected((prev) => ({ ...prev, [item.id]: ev.target.checked }))
                    }
                  />
                  <label htmlFor={`sc-${item.id}`} className="cursor-pointer">
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{item.id}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={runBusy || catalog.length === 0}
            onClick={() => void runSelectedScenarios()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {runBusy ? "Выполняется…" : `Запустить (${selectedCount})`}
          </button>
          {runError && <p className="mt-2 text-xs text-destructive">{runError}</p>}
          {runs.length > 0 && (
            <div className="mt-4 space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="rounded-md border border-border p-3 text-xs">
                  <p className="font-semibold">
                    {run.scenario_id} · {run.status} · {run.mode}
                    {run.form_id ? (
                      <>
                        {" "}
                        · form{" "}
                        <VedFormLink id={run.form_id} className="font-mono underline">
                          {run.form_id}
                        </VedFormLink>
                      </>
                    ) : null}
                  </p>
                  {run.error && <p className="text-destructive">{run.error}</p>}
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    {run.steps?.map((st) => (
                      <li key={st.step_id} className={st.ok ? "text-done" : "text-destructive"}>
                        {st.ok ? "ok" : "fail"} · {st.title}
                        {st.actual_status ? ` · ${st.actual_status}` : ""}
                        {st.detail ? ` — ${st.detail}` : ""}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-4">
              <p className="label-caps">История запусков</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {history.map((h) => (
                  <li key={h.id} className="font-mono">
                    {h.id} · {h.scenario_id} · {h.status} · {h.mode}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === "app" && (
        <div className="panel mt-4 p-4">
          <p className="label-caps">Bank API smoke</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Логин bank@vdp.local · org {BANK_ORG_ID} · каталог bank_channel_badge
          </p>
          <button
            type="button"
            disabled={bankBusy}
            onClick={() => void simulateBankCreate()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {bankBusy ? "Запрос…" : "Создать bank-заявку"}
          </button>
          {bankResult && <p className="mt-2 text-xs text-done">{bankResult}</p>}
          {bankError && <p className="mt-2 text-xs text-destructive">{bankError}</p>}
        </div>
      )}

      <div className="panel mt-4 p-4">
        <p className="label-caps">
          {isApp ? "Seed-аккаунты app (вход на /login)" : "Тестовые аккаунты (вход на /demo/login)"}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps py-2 pr-4">Роль</th>
                <th className="label-caps py-2 pr-4">Сотрудник</th>
                <th className="label-caps py-2 pr-4">Логин</th>
                <th className="label-caps py-2 pr-4">Пароль</th>
                <th className="label-caps py-2 pr-4 text-right">Заявок с действиями</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map((row) => (
                <tr key={row.roleId} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{row.title}</td>
                  <td className="py-2 pr-4 text-xs">{row.personName}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{row.email}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{row.password}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {forms.filter((f) => actionsFor(row.roleId, f.status).length > 0).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {isApp
            ? `App-контур: JWT через /login. Аккаунтов: ${users.length}. Orgs: ${organizations.length}. E2E: make compose-e2e / make playwright-e2e.`
            : `Демо: вход по роли. Аккаунтов: ${users.length}.`}
        </p>
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Заявки набора ({forms.length})</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps py-2 pr-4">Номер</th>
                <th className="label-caps py-2 pr-4">Статус</th>
                <th className="label-caps py-2 pr-4">Канал</th>
                <th className="label-caps py-2 pr-4">Стадия</th>
                <th className="label-caps py-2 pr-4">Кто действует</th>
                <th className="label-caps py-2 pr-4 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => {
                const actors = ROLES.filter((r) => actionsFor(r.id, f.status).length > 0 && r.id !== "root");
                return (
                  <tr key={f.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <VedFormLink id={f.id} className="font-mono text-xs font-semibold hover:underline">
                        {f.number}
                      </VedFormLink>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {f.channel === "bank" ? (
                        <span className="rounded-md bg-wait-soft px-1.5 py-0.5 font-semibold text-wait">
                          Bank API
                        </span>
                      ) : (
                        <span className="text-muted-foreground">UI</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{statusMeta(f.status).stage}</td>
                    <td className="py-2 pr-4 text-xs">{actors.map((a) => a.title).join(", ") || "—"}</td>
                    <td className="py-2 pr-4 text-right font-mono text-xs">
                      {money(f.amountMinor, f.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </VedAppShell>
  );
}
