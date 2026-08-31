import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";
import { ActionPanel } from "@/components/ved/ActionPanel";
import { StageStepper } from "@/components/ved/StageStepper";
import { DocumentList } from "@/components/ved/DocumentViewer";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { SubjectReview } from "@/components/ved/SubjectReview";
import { RequireAuth } from "@/lib/auth/session";
import { isComplianceRole, subjectState, subjectsCleared, subjectsOf } from "@/lib/ved/compliance";
import { dateTime, money } from "@/lib/ved/format";
import { cpById, orgById } from "@/lib/ved/mock";
import { roleTitle } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";
import { usePlatformForm } from "@/lib/ved/use-platform-forms";
import { useWorkspaceData } from "@/lib/ved/use-workspace-data";
import { useIsDemoWorkspace, useWorkspaceBasePath } from "@/lib/ved/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forms/$id")({
  head: () => ({
    meta: [
      { title: "Карточка платёжной заявки — ВЭД от Вилетех" },
      { name: "description", content: "Детали платёжной заявки ВЭД: стадии, документы, хронология событий и действия по роли." },
      { property: "og:title", content: "Карточка платёжной заявки — ВЭД от Вилетех" },
      { property: "og:description", content: "Стадии, документы, хронология и доступные действия по заявке." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <FormDetail />
    </RequireAuth>
  ),
});

export function FormDetail() {
  const { id } = Route.useParams();
  const isDemo = useIsDemoWorkspace();
  const basePath = useWorkspaceBasePath();
  const workspace = useWorkspaceData();
  const platformForm = usePlatformForm(isDemo ? "" : id);
  const form = isDemo ? workspace.forms.find((f) => f.id === id) : platformForm.data;
  const role = workspace.session?.role ?? "user";
  const organizations = workspace.organizations;
  const counterparties = workspace.counterparties;

  if (!form) {
    return (
      <AppShell title="Заявка не найдена">
        <div className="panel p-6 text-sm text-muted-foreground">
          {!isDemo && platformForm.isLoading ? "Загрузка…" : "Заявка удалена или недоступна."}{" "}
          <Link to={`${basePath}/forms`} search={{}} className="font-semibold text-accent hover:underline">
            Вернуться в реестр
          </Link>
        </div>
      </AppShell>
    );
  }

  const org = orgById(form.organizationId);
  const cp = cpById(form.counterpartyId);
  const meta = statusMeta(form.status);
  const compliance = isComplianceRole(role);
  const subjects = subjectsOf(form, organizations, counterparties);
  const cleared = subjectsCleared(subjects);
  const hasBlocked = subjects.some((s) => s.status === "blocked");

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
    <AppShell title={form.number} subtitle={`${meta.label} · роль: ${roleTitle(role)}`}>
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

      {(form.rejectText || form.rejectMark) && (
        <div className="mt-4 rounded-lg bg-return-soft p-4">
          <p className="label-caps text-return">Возврат на доработку</p>
          {form.rejectMark && <p className="mt-1 text-sm font-semibold text-return">Отметка: {form.rejectMark}</p>}
          {form.rejectText && <p className="mt-1 text-sm text-return">{form.rejectText}</p>}
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
            <DocumentList documents={form.documents} />
          </div>
        </div>

        <div className="space-y-4">
          {compliance ? (
            <>
              <ActionPanel
                form={form}
                title="Рассмотрение заявки"
                {...(hasBlocked
                  ? { lockNote: "Участник сделки заблокирован — заявку нельзя согласовать." }
                  : cleared
                    ? {}
                    : { note: "Участники ещё на проверке. Саму заявку можно рассмотреть отдельно." })}
              />
              <SubjectReview subjects={subjects} />
            </>
          ) : (
            <ActionPanel form={form} />
          )}

          {!compliance && subjects.some((s) => !subjectState(s.status).ok) && (
            <SubjectReview subjects={subjects} readOnly />
          )}

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
    </AppShell>
  );
}
