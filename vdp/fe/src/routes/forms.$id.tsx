import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppActionPanel } from "@/components/ved/AppActionPanel";
import { AppShell } from "@/components/ved/AppShell";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { StageStepper } from "@/components/ved/StageStepper";
import { getForm } from "@/lib/api/forms";
import { mapCoreFormToPaymentForm, nextStepHint } from "@/lib/api/mappers";
import { useAuth } from "@/lib/auth/session";
import { dateTime, money } from "@/lib/ved/format";
import { roleTitle } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";

export const Route = createFileRoute("/forms/$id")({
  head: () => ({
    meta: [{ title: "Карточка заявки — Viletech ВЭД" }],
  }),
  component: FormDetail,
});

function FormDetail() {
  const { id } = Route.useParams();
  const { role, displayName } = useAuth();
  const query = useQuery({
    queryKey: ["form", id],
    queryFn: () => getForm(id),
  });

  if (query.isLoading) {
    return (
      <AppShell title="Заявка">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </AppShell>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppShell title="Заявка не найдена">
        <div className="panel p-6 text-sm text-muted-foreground">
          Не удалось загрузить заявку.{" "}
          <Link to="/forms" className="font-semibold text-accent hover:underline">
            В реестр
          </Link>
        </div>
      </AppShell>
    );
  }

  const form = mapCoreFormToPaymentForm(query.data, displayName);
  const meta = statusMeta(form.status);
  const hidePii = role === "provider";

  const facts: [string, string][] = [
    ["Направление", form.direction === "import" ? "Импорт" : "Экспорт"],
    ["Предмет", form.kind === "good" ? "Товар" : "Услуга"],
    ["Сумма", money(form.amountMinor, form.currency)],
    ["Организация", form.organizationId],
    ["Контрагент", form.counterpartyId === "—" ? "—" : form.counterpartyId],
    ["Создана", dateTime(form.createdAt)],
    ["Обновлена", dateTime(form.updatedAt)],
  ];

  return (
    <AppShell title={form.number} subtitle={`${meta.label} · ${role ? roleTitle(role) : "—"}`}>
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <DirectionTag direction={form.direction} />
        <StatusBadge status={form.status} full />
        <span className="ml-auto font-mono text-lg font-semibold">{money(form.amountMinor, form.currency)}</span>
      </div>

      <div className="mt-4 rounded-lg bg-accent-soft p-4">
        <p className="label-caps">Что дальше</p>
        <p className="mt-1 text-sm">{nextStepHint(form.status)}</p>
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Жизненный цикл</p>
        <div className="mt-3">
          <StageStepper status={form.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel p-4">
          <p className="label-caps">Параметры заявки</p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="label-caps">{k}</dt>
                <dd className="font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          {!hidePii && (
            <p className="mt-4 text-xs text-muted-foreground">
              Клиент (проекция): <span className="font-semibold text-foreground">{form.ownerName}</span>
            </p>
          )}
        </div>
        <AppActionPanel form={form} />
      </div>
    </AppShell>
  );
}
