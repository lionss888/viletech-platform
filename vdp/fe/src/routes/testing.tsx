import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/ved/AppShell";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { actionsFor } from "@/lib/ved/actions";
import { money } from "@/lib/ved/format";
import { ROLES } from "@/lib/ved/roles";
import { statusMeta } from "@/lib/ved/statuses";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/testing")({
  head: () => ({
    meta: [
      { title: "Тестовые данные и сценарии — Viletech ВЭД" },
      { name: "description", content: "Тестовые аккаунты всех шести ролей, набор заявок по каждой стадии и сценарии ручной проверки интерфейса ВЭД." },
      { property: "og:title", content: "Тестовые данные и сценарии — Viletech ВЭД" },
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
      "Провайдер: «Платёж отправлен».",
      "Менеджер: отчёт агента → подтверждение → отгрузка → «Закрыть заявку».",
    ],
  },
  {
    title: "Возвраты и коррекции",
    steps: [
      "Комплаенс: «Вернуть на коррекцию» с причиной — проверьте баннер комментария в карточке.",
      "Клиент: статус «Возвращена на коррекцию» → «Отправить исправления».",
      "Провайдер: «Вернуть менеджеру» — заявка уходит в «Уточнение».",
    ],
  },
  {
    title: "Права и видимость",
    steps: [
      "Провайдер видит только платёжные статусы и не видит ПДн клиента (колонка «Клиент» скрыта).",
      "Клиент видит только собственные заявки.",
      "Суперадмин видит всё и может отменить любую активную заявку; раздел «Пользователи» доступен только ему.",
    ],
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

function TestingPage() {
  const { forms, users } = useVed();

  return (
    <AppShell title="Тестовые данные и сценарии" subtitle="Для ручной проверки интерфейса по всем ролям">
      <div className="panel p-4">
        <p className="label-caps">Тестовые аккаунты (вход на экране /)</p>
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
              {ROLES.map((role) => (
                <tr key={role.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{role.title}</td>
                  <td className="py-2 pr-4 text-xs">{role.personName}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{role.seedEmail}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{role.seedPassword}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {forms.filter((f) => actionsFor(role.id, f.status).length > 0).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          В демо пароль не проверяется — вход по кнопке роли. Всего аккаунтов в наборе: {users.length}.
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
                      <Link to="/forms/$id" params={{ id: f.id }} className="font-mono text-xs font-semibold hover:underline">
                        {f.number}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={f.status} />
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
    </AppShell>
  );
}
