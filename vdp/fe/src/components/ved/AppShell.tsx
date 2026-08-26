import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/session";
import { roleTitle } from "@/lib/ved/roles";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

const NAV: { to: string; label: string; roles: VedRole[] | "all" }[] = [
  { to: "/dashboard", label: "Рабочий стол", roles: "all" },
  { to: "/forms", label: "Реестр заявок", roles: "all" },
  { to: "/forms/new", label: "Новая заявка", roles: ["user", "manager", "root"] },
  { to: "/counterparties", label: "Контрагенты", roles: "all" },
  { to: "/organizations", label: "Организации", roles: "all" },
];

export function AppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { role, displayName, email, logout, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка сессии…</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const nav = NAV.filter((item) => item.roles === "all" || (role && item.roles.includes(role)));

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
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.to && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <p className="text-xs text-muted-foreground">
            Роль: <span className="font-semibold text-foreground">{role ? roleTitle(role) : "—"}</span>
          </p>
          <Link
            to="/demo/login"
            className="block w-full rounded-md px-3 py-2 text-center text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Демо без бэкенда
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              void navigate({ to: "/login" });
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
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold">{displayName}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{email}</p>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        <footer className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground lg:px-6">
          API · vdp/core · роль {role ? roleTitle(role) : "—"}
        </footer>
      </div>
    </div>
  );
}
