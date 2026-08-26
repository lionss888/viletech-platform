import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ROLES } from "@/lib/ved/roles";
import { useVed, visibleForms } from "@/lib/ved/store";
import { actionsFor } from "@/lib/ved/actions";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

const NAV: { to: string; label: string; roles: VedRole[] | "all" }[] = [
  { to: "/dashboard", label: "Рабочий стол", roles: "all" },
  { to: "/forms", label: "Реестр заявок", roles: "all" },
  { to: "/forms/new", label: "Новая заявка", roles: ["user", "manager", "root"] },
  { to: "/counterparties", label: "Контрагенты", roles: ["user", "manager", "internal_compliance_officer", "compliance_officer", "root"] },
  { to: "/organizations", label: "Организации", roles: ["internal_compliance_officer", "manager", "root"] },
  { to: "/admin", label: "Пользователи", roles: ["root"] },
  { to: "/testing", label: "Проверка сценариев", roles: ["root"] },
];

export function AppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { session, signIn, signOut, forms, resetDemo } = useVed();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const role = session?.role;
  const mine = visibleForms(forms, role, session?.name);
  const todo = mine.filter((f) => actionsFor(role ?? "user", f.status).length > 0).length;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <Link to="/forms" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-semibold tracking-tight">Viletech ВЭД</span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV.filter((item) => item.roles === "all" || (role && item.roles.includes(role))).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.to && "bg-muted text-foreground",
              )}
            >
              {item.label}
              {item.to === "/forms" && todo > 0 && (
                <span className="ml-2 rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground">{todo}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div>
            <p className="label-caps">Роль</p>
            <select
              value={role ?? ""}
              onChange={(e) => signIn(e.target.value as VedRole)}
              className="field mt-1 text-xs"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.personName}
                </option>
              ))}
            </select>
          </div>
          {role === "root" && (
            <button type="button" onClick={resetDemo} className="w-full rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
              Сбросить данные
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate({ to: "/login" });
            }}
            className="w-full rounded-md px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive-soft"
          >
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">{session?.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{session?.email}</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
              {(session?.name ?? "?").slice(0, 1)}
            </span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {NAV.filter((item) => item.roles === "all" || (role && item.roles.includes(role))).map((item) => (
            <Link key={item.to} to={item.to} className="rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        <footer className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground lg:px-6">
          Viletech ВЭД · сделок в системе: {forms.length}
        </footer>
      </div>
    </div>
  );
}
