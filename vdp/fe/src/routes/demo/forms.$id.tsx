import { createFileRoute, Link } from "@tanstack/react-router";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { ActionPanel } from "@/components/ved/ActionPanel";
import { StageStepper } from "@/components/ved/StageStepper";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { dateTime, money } from "@/lib/ved/format";
import { cpById, orgById } from "@/lib/ved/mock";
import { roleTitle } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";
import { useVed } from "@/lib/ved/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/forms/$id")({
  head: () => ({
    meta: [
      { title: "Карточка платёжной заявки — Viletech ВЭД" },
      { name: "description", content: "Детали платёжной заявки ВЭД: стадии, документы, хронология событий и действия по роли." },
      { property: "og:title", content: "Карточка платёжной заявки — Viletech ВЭД" },
      { property: "og:description", content: "Стадии, документы, хронология и доступные действия по заявке." },
    ],
  }),
  component: FormDetail,
});

function FormDetail() {
  const { id } = Route.useParams();
  const { forms, session } = useVed();
  const form = forms.find((f) => f.id === id);
  const role = session?.role ?? "user";

  if (!form) {
    return (
      <DemoAppShell title="Заявка не найдена">
        <div className="panel p-6 text-sm text-muted-foreground">
          Заявка удалена или сброшены тестовые данные.{" "}
          <Link to="/demo/forms" className="font-semibold text-accent hover:underline">
            Вернуться в реестр
          </Link>
        </div>
      </DemoAppShell>
    );
  }

  const org = orgById(form.organizationId);
  const cp = cpById(form.counterpartyId);
  const meta = statusMeta(form.status);

  const facts: [string, string][] = [
    ["Направление", form.direction === "import" ? "Импорт" : "Экспорт"],
    ["Предмет", form.kind === "good" ? "Товар" : "Услуга"],
    ["Условие оплаты", form.condition === "advance" ? "Аванс" : "Постоплата"],
    ["Код ТН ВЭД", form.hsCode],
    ["Инвойс", form.invoiceNumber],
    ["Сумма", money(form.amountMinor, form.currency)],
    ["Создана", dateTime(form.createdAt)],
    ["Обновлена", dateTime(form.updatedAt)],
  ];

  return (
    <DemoAppShell title={form.number} subtitle={`${meta.label} · роль: ${roleTitle(role)}`}>
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <DirectionTag direction={form.direction} />
        <StatusBadge status={form.status} full />
        <span className="ml-auto font-mono text-lg font-semibold">{money(form.amountMinor, form.currency)}</span>
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Жизненный цикл</p>
        <div className="mt-3">
          <StageStepper status={form.status} />
        </div>
      </div>

      {form.rejectText && (
        <div className="mt-4 rounded-lg bg-return-soft p-4">
          <p className="label-caps text-return">Комментарий проверяющего</p>
          <p className="mt-1 text-sm text-return">{form.rejectText}</p>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel p-4">
              <p className="label-caps">Организация клиента</p>
              <p className="mt-2 text-sm font-semibold">{org?.name}</p>
              <p className="font-mono text-xs text-muted-foreground">ИНН {org?.inn}</p>
              <p className="mt-1 text-xs text-muted-foreground">{org?.legalAddress}</p>
            </div>
            <div className="panel p-4">
              <p className="label-caps">Контрагент</p>
              <p className="mt-2 text-sm font-semibold">{cp?.name}</p>
              <p className="text-xs text-muted-foreground">
                {cp?.country} · {cp?.bank}
              </p>
              <p className="font-mono text-xs text-muted-foreground">SWIFT {cp?.swift}</p>
            </div>
          </div>

          <div className="panel p-4">
            <p className="label-caps">Документы ({form.documents.length})</p>
            <ul className="mt-3 divide-y divide-border">
              {form.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">{d.ext}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{d.size}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{dateTime(d.uploadedAt)}</span>
                </li>
              ))}
              {form.documents.length === 0 && <li className="py-3 text-sm text-muted-foreground">Документов пока нет</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <ActionPanel form={form} />

          {role !== "provider" && (
            <div className="panel p-4">
              <p className="label-caps">Участники</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Клиент: {form.ownerName}</li>
                <li>Менеджер: {form.managerName ?? "не назначен"}</li>
                <li>Провайдер: {form.providerName ?? "не назначен"}</li>
              </ul>
            </div>
          )}

          <div className="panel p-4">
            <p className="label-caps">Хронология</p>
            <ol className="mt-3 space-y-3">
              {form.timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.done ? "bg-done" : "bg-border")} />
                  <span className="min-w-0">
                    <span className={cn("block text-sm", entry.done ? "font-medium" : "text-muted-foreground")}>{entry.title}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {dateTime(entry.at)} · {roleTitle(entry.actorRole)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </DemoAppShell>
  );
}
