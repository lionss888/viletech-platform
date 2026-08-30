import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VedFormLink } from "@/components/ved/VedLink";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { smokeCreateBankForm } from "@/lib/api/bank";
import { actionsFor } from "@/lib/ved/actions";
import { APP_SEED_ACCOUNTS } from "@/lib/ved/app-seed-accounts";
import { BANK_ORG_ID } from "@/lib/ved/bank-channel";
import { BANK_CHANNEL_BADGE, BANK_TESTING, formatBankCreateSuccess } from "@/lib/ved/copy/bank-copy";
import { money } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { ROLES } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";
import { usePlatformStore } from "@/lib/ved/platform-store";

export const Route = createFileRoute("/demo/testing")({
  head: () => ({
    meta: [
      { title: "Тестовые данные и сценарии — ВЭД от Вилетех" },
      { name: "description", content: "Тестовые аккаунты всех шести ролей, набор заявок по каждой стадии и сценарии ручной проверки интерфейса ВЭД." },
      { property: "og:title", content: "Тестовые данные и сценарии — ВЭД от Вилетех" },
      { property: "og:description", content: "Аккаунты ролей, заявки по стадиям и пошаговые сценарии ручного тестирования." },
    ],
  }),
  component: TestingPage,
});

const SCENARIOS: { title: string; steps: string[] }[] = [
  {
    title: "Сквозной happy path (все роли)",
    steps: [
      "Клиент: заявка «Черновик» → «Отправить на проверку».",
      "Внутренний комплаенс: «Взять в проверку» → «Одобрить организацию и заявку».",
      "Внешний комплаенс: «Взять в проверку» → «Подтвердить заявку».",
      "Менеджер: «Прикрепить агентский договор», затем «Сформировать поручение принципала».",
      "Клиент: «Загрузить подписанное поручение», далее «Загрузить платёжное поручение».",
      "Менеджер: «Назначить провайдера» → «Запустить исполнение платежа».",
      "Провайдер: «Подтвердить отправку платежа».",
      "Менеджер: отчёт агента → подтверждение → отгрузка → «Закрыть заявку».",
    ],
  },
  {
    title: "Возвраты и коррекции",
    steps: [
      "Комплаенс: «Вернуть на коррекцию» с причиной — проверьте баннер комментария в карточке.",
      "Клиент: статус «Возвращена на коррекцию» → «Отправить исправления».",
      "Провайдер: «Вернуть на уточнение менеджеру» — заявка уходит в «Уточнение».",
    ],
  },
  {
    title: "Права и видимость",
    steps: [
      "Провайдер видит только платёжные статусы и не видит ПДн клиента (колонка «Клиент» скрыта).",
      "Клиент видит только собственные заявки.",
      "Суперадмин: union CTA на карточке + «Отменить заявку» в блоке администрирования; `/admin` — CRUD и блокировка.",
    ],
  },
  {
    title: BANK_TESTING.scenarioTitle,
    steps: [...BANK_TESTING.scenarioSteps],
  },
  {
    title: "Реестр и массовые действия",
    steps: [
      "Фильтр «Только мои действия» оставляет заявки с доступными CTA.",
      "Выберите 2–3 заявки в одном статусе — появятся общие массовые действия.",
      "«Сбросить тестовые данные» в сайдбаре возвращает исходный набор.",
    ],
  },
];

export function TestingPage() {
  const { forms, users, organizations, counterparties } = usePlatformStore();
  const mode = usePlatformMode();
  const queryClient = useQueryClient();
  const isApp = mode === "app";
  const [bankBusy, setBankBusy] = useState(false);
  const [bankResult, setBankResult] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

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

  async function simulateBankCreate() {
    setBankBusy(true);
    setBankError(null);
    setBankResult(null);
    try {
      const correlationId = `corr-${Date.now()}`;
      const form = await smokeCreateBankForm(
        {
          organization_id: BANK_ORG_ID,
          counterparty_id: counterparties[0]?.id,
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
      setBankResult(formatBankCreateSuccess(form.id, form.correlation_id ?? correlationId));
    } catch (e) {
      setBankError(e instanceof Error ? e.message : BANK_TESTING.simulateError);
    } finally {
      setBankBusy(false);
    }
  }

  return (
    <VedAppShell title="Тестовые данные и сценарии" subtitle="Для ручной проверки интерфейса по всем ролям">
      {mode === "app" && (
        <div className="panel p-4">
          <p className="label-caps">{BANK_TESTING.smokeTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{BANK_TESTING.smokeHint(BANK_ORG_ID)}</p>
          <button
            type="button"
            disabled={bankBusy}
            onClick={() => void simulateBankCreate()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {bankBusy ? BANK_TESTING.simulateBusy : BANK_TESTING.simulateButton}
          </button>
          {bankResult && <p className="mt-2 text-xs text-done">{bankResult}</p>}
          {bankError && <p className="mt-2 text-xs text-destructive">{bankError}</p>}
        </div>
      )}
      <div className="panel p-4">
        <p className="label-caps">{isApp ? "Seed-аккаунты app (вход на /login)" : "Тестовые аккаунты (вход на /demo/login)"}</p>
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
            ? `App-контур: JWT через /login, API core на :8080. Аккаунтов в БД: ${users.length}. E2E: make compose-e2e.`
            : `Демо: пароль не проверяется — вход по кнопке роли. Аккаунтов в наборе: ${users.length}.`}
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {SCENARIOS.map((s) => (
          <div key={s.title} className="panel p-4">
            <p className="text-sm font-semibold">{s.title}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Заявки набора ({forms.length}) — по одной на каждый ключевой статус</p>
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
                        <span className="rounded-md bg-wait-soft px-1.5 py-0.5 font-semibold text-wait">{BANK_CHANNEL_BADGE.bankShort}</span>
                      ) : (
                        <span className="text-muted-foreground">{BANK_CHANNEL_BADGE.uiShort}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{statusMeta(f.status).stage}</td>
                    <td className="py-2 pr-4 text-xs">{actors.map((a) => a.title).join(", ") || "—"}</td>
                    <td className="py-2 pr-4 text-right font-mono text-xs">{money(f.amountMinor, f.currency)}</td>
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
