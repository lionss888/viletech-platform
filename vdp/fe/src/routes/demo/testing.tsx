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
  wipeProbeData,
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
          "Проверка основных процессов платформы для суперадмина: заявки, роли, безопасность.",
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
  const [wipeBusy, setWipeBusy] = useState(false);
  const [wipeMessage, setWipeMessage] = useState<string | null>(null);
  const [wipeError, setWipeError] = useState<string | null>(null);

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
      setCatalog(Array.isArray(cat) ? cat : []);
      setPolicy(pol);
      setHistory(Array.isArray(hist) ? hist : []);
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
        "Тестовая заявка от банка создана. Откройте её в реестре — рядом должна быть метка «от банка».",
      );
    } catch (e) {
      setBankError(e instanceof Error ? e.message : "Не удалось создать заявку от банка");
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
  const allSelected = catalog.length > 0 && catalog.every((item) => selected[item.id]);

  function selectAllScenarios(on: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of catalog) {
        next[item.id] = on;
      }
      return next;
    });
  }

  async function clearProbeForms() {
    if (
      !window.confirm(
        "Удалить все заявки и связанные документы из локальной БД? Учётки ролей останутся. Это нельзя отменить.",
      )
    ) {
      return;
    }
    setWipeBusy(true);
    setWipeError(null);
    setWipeMessage(null);
    try {
      const res = await wipeProbeData();
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      setWipeMessage(`Очищено заявок: ${res.wiped_forms}. Реестр и документы по заявкам пустые.`);
    } catch (e) {
      setWipeError(e instanceof Error ? e.message : "Не удалось очистить");
    } finally {
      setWipeBusy(false);
    }
  }

  const modeLabel =
    policy?.default_mode === "mutating"
      ? "полная проверка (создаются тестовые заявки)"
      : policy?.default_mode === "dry_run"
        ? "только сверка правил (без изменений в заявках)"
        : policy?.default_mode === "health"
          ? "проверка доступности"
          : policy?.default_mode ?? "…";

  return (
    <VedAppShell
      title="Проверка сценариев"
      subtitle="Контроль основных процессов платформы — для суперадмина"
    >
      {isApp && (
        <div className="panel mb-4 p-4">
          <p className="label-caps">Очистка тестовых данных</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Сейчас в системе {forms.length} заявок (футер «сделок»). Для ручных тестов с нуля очистите
            заявки — учётки user/manager/… останутся. После очистки mutating-сценарии снова создадут
            свои probe-заявки.
          </p>
          <button
            type="button"
            disabled={wipeBusy}
            onClick={() => void clearProbeForms()}
            className="mt-3 rounded-md border border-destructive px-3 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
          >
            {wipeBusy ? "Очищаем…" : "Очистить все заявки"}
          </button>
          {wipeMessage && <p className="mt-2 text-xs text-accent">{wipeMessage}</p>}
          {wipeError && <p className="mt-2 text-xs text-destructive">{wipeError}</p>}
        </div>
      )}
      {isApp && (
        <div className="panel p-4">
          <p className="label-caps">Что проверить</p>
          <p className="mt-1 text-xs text-muted-foreground">
            В каталоге {catalog.length || "…"} сценариев (фиксированный набор). Это не число заявок в
            системе — в футере «сделок в системе» считается отдельно ({forms.length} сейчас). Отметьте
            сценарии и нажмите «Запустить». Система сама пройдёт шаги ролей на тестовых данных и
            покажет, где всё хорошо, а где сбой. Режим: {modeLabel}
            {policy && !policy.allows_mutating_runs
              ? ". В этой среде нельзя менять заявки — только безопасная сверка."
              : ""}
          </p>
          {catalogError && <p className="mt-2 text-xs text-destructive">{catalogError}</p>}
          {catalog.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(ev) => selectAllScenarios(ev.target.checked)}
                />
                Выбрать всё ({catalog.length})
              </label>
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => selectAllScenarios(false)}
              >
                Снять всё
              </button>
            </div>
          )}
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
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={runBusy || catalog.length === 0 || selectedCount === 0}
            onClick={() => void runSelectedScenarios()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {runBusy
              ? "Идёт проверка…"
              : selectedCount === 0
                ? "Выберите сценарии"
                : `Запустить проверку (${selectedCount})`}
          </button>
          {runError && <p className="mt-2 text-xs text-destructive">{runError}</p>}
          {runs.length > 0 && (
            <div className="mt-4 space-y-3">
              {runs.map((run) => {
                const title =
                  catalog.find((c) => c.id === run.scenario_id)?.title ?? run.scenario_id;
                const statusRu =
                  run.status === "passed"
                    ? "успешно"
                    : run.status === "failed"
                      ? "есть ошибки"
                      : run.status === "running"
                        ? "выполняется"
                        : run.status;
                const modeRu =
                  run.mode === "mutating"
                    ? "с тестовыми заявками"
                    : run.mode === "dry_run"
                      ? "без изменений"
                      : run.mode === "health"
                        ? "доступность"
                        : run.mode;
                return (
                  <div key={run.id} className="rounded-md border border-border p-3 text-xs">
                    <p className="font-semibold">
                      {title} — {statusRu} ({modeRu})
                      {run.form_id ? (
                        <>
                          {" "}
                          ·{" "}
                          <VedFormLink id={run.form_id} className="underline">
                            открыть тестовую заявку
                          </VedFormLink>
                        </>
                      ) : null}
                    </p>
                    {run.error && (
                      <p className="text-destructive">{humanizeScenarioDetail(run.error)}</p>
                    )}
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      {run.steps?.map((st) => {
                        const stepTitle =
                          catalog
                            .find((c) => c.id === run.scenario_id)
                            ?.steps?.find((s) => s.id === st.step_id)?.title ?? st.title;
                        const detail = humanizeScenarioDetail(st.detail);
                        return (
                          <li key={st.step_id} className={st.ok ? "text-done" : "text-destructive"}>
                            {st.ok ? "Готово" : "Сбой"}: {stepTitle}
                            {st.actual_status
                              ? ` — ${statusMeta(st.actual_status).label}`
                              : ""}
                            {detail ? ` — ${detail}` : ""}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
          {(history ?? []).length > 0 && (
            <div className="mt-4">
              <p className="label-caps">Недавние проверки</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(history ?? []).map((h) => {
                  const title =
                    catalog.find((c) => c.id === h.scenario_id)?.title ?? h.scenario_id;
                  const statusRu = h.status === "passed" ? "успешно" : h.status === "failed" ? "ошибка" : h.status;
                  return (
                    <li key={h.id}>
                      {title} — {statusRu}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === "app" && (
        <div className="panel mt-4 p-4">
          <p className="label-caps">Заявка от банка (не из кабинета клиента)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Иногда заявки приходят от банка-партнёра, а не из кабинета клиента. Кнопка создаёт
            такую тестовую заявку — в реестре у неё будет метка «от банка».
          </p>
          <button
            type="button"
            disabled={bankBusy}
            onClick={() => void simulateBankCreate()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {bankBusy ? "Создаём…" : "Создать тестовую заявку от банка"}
          </button>
          {bankResult && <p className="mt-2 text-xs text-done">{bankResult}</p>}
          {bankError && <p className="mt-2 text-xs text-destructive">{bankError}</p>}
        </div>
      )}

      <div className="panel mt-4 p-4">
        <p className="label-caps">
          {isApp ? "Тестовые входы по ролям" : "Демо-входы по ролям"}
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
            ? `Вход через страницу «Вход». Аккаунтов в системе: ${users.length}. Организаций: ${organizations.length}.`
            : `Демо-режим: вход выбором роли. Аккаунтов: ${users.length}.`}
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
                <th className="label-caps py-2 pr-4">Откуда</th>
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
                          от банка
                        </span>
                      ) : (
                        <span className="text-muted-foreground">кабинет клиента</span>
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

/** Soften leftover technical API text for managers. */
function humanizeScenarioDetail(detail: string | undefined): string {
  if (!detail) return "";
  const trimmed = detail.trim();
  if (/^PUT\s+\/api\//i.test(trimmed) || /^POST\s+\/api\//i.test(trimmed) || /^GET\s+\/api\//i.test(trimmed)) {
    if (trimmed.includes("403")) return "у роли нет права на это действие";
    if (trimmed.includes("409")) return "действие сейчас нельзя выполнить из‑за текущего статуса заявки";
    if (trimmed.includes("401")) return "не удалось войти под нужной ролью";
    if (trimmed.includes("404")) return "заявка или объект не найдены";
    return "система отклонила шаг проверки";
  }
  if (/code=\d+/i.test(trimmed) || /channel=/i.test(trimmed) || /want\s+\d+/i.test(trimmed)) {
    return "результат шага не совпал с ожидаемым";
  }
  return trimmed;
}
