import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { ROLES } from "@/lib/ved/roles";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/demo/start")({
  head: () => ({
    meta: [
      { title: "Быстрый вход по роли — ВЭД от Вилетех" },
      {
        name: "description",
        content: "Выберите роль и войдите в платформу ВЭД: клиент, комплаенс, менеджер, провайдер, администратор.",
      },
      { property: "og:title", content: "Быстрый вход по роли — ВЭД от Вилетех" },
      { property: "og:description", content: "Выбор роли для входа в операционный контур платежей." },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { signIn } = useVed();
  const navigate = useNavigate();

  function enter(roleId: (typeof ROLES)[number]["id"]) {
    signIn(roleId);
    navigate({ to: "/demo/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div>
          <span className="grid size-10 place-items-center rounded-lg bg-primary font-mono text-base font-bold text-primary-foreground">
            V
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight lg:text-4xl">
            ВЭД — операционный контур платежей
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Управление сделками, документами и платежами. Выберите роль, чтобы открыть рабочее место с релевантными
            заявками и действиями.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/demo/login"
              className="w-full rounded-md bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Войти по логину и паролю
            </Link>
            <Link
              to="/login"
              className="w-full rounded-md px-5 py-2.5 text-center text-sm font-semibold shadow-[0_0_0_1px_var(--input)] transition-colors hover:bg-muted sm:w-auto"
            >
              Войти через API
            </Link>
            <Link
              to="/"
              className="w-full rounded-md px-5 py-2.5 text-center text-sm font-semibold shadow-[0_0_0_1px_var(--input)] transition-colors hover:bg-muted sm:w-auto"
            >
              О платформе
            </Link>
          </div>
        </div>

        <div className="panel p-5">
          <p className="label-caps">Вход по роли</p>
          <div className="mt-3 flex flex-col gap-2">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => enter(role.id)}
                className="flex items-center justify-between gap-3 rounded-md p-3 text-left shadow-[0_0_0_1px_var(--input)] transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{role.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{role.personName}</span>
                </span>
                <span className="label-caps shrink-0">{role.group}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Роль можно сменить на любом экране в боковом меню.
          </p>
        </div>
      </div>
    </div>
  );
}
