import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { ROLES } from "@/lib/ved/roles";
import { useVed, visibleForms } from "@/lib/ved/store";
import { actionsFor } from "@/lib/ved/actions";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

type NavItem = { to: string; label: string; roles: VedRole[] | "all" };

const NAV: NavItem[] = [
  { to: "/demo/dashboard", label: "Рабочий стол", roles: "all" },
  { to: "/demo/forms", label: "Реестр заявок", roles: ["user", "manager", "provider", "root"] },
  { to: "/demo/forms", label: "Входящие заявки", roles: ["internal_compliance_officer", "compliance_officer"] },
  { to: "/demo/organizations", label: "Проверка организаций", roles: ["internal_compliance_officer", "compliance_officer"] },
  { to: "/demo/forms/new", label: "Новая заявка", roles: ["user", "manager", "root"] },
  { to: "/demo/documents", label: "Документы", roles: ["user", "manager", "provider", "root"] },
];

const REFERENCES: NavItem[] = [
  { to: "/demo/counterparties", label: "Контрагенты", roles: ["user", "manager", "root"] },
  { to: "/demo/organizations", label: "Организации", roles: ["manager", "root"] },
  { to: "/demo/compliance-tools", label: "Инструменты комплаенс", roles: ["root"] },
  { to: "/demo/admin", label: "Пользователи", roles: ["root"] },
  { to: "/demo/providers", label: "Провайдеры", roles: ["manager", "root"] },
  { to: "/demo/codes", label: "Коды ТН ВЭД", roles: ["manager", "root"] },
  { to: "/demo/currencies", label: "Валюты", roles: ["manager", "root"] },
  { to: "/demo/countries", label: "Страны и риски", roles: ["root"] },
  { to: "/demo/testing", label: "Проверка сценариев", roles: ["root"] },
];

const allowed = (items: NavItem[], role: VedRole | undefined) =>
  items.filter((item) => item.roles === "all" || (role && item.roles.includes(role)));

export function DemoAppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { session, signIn, signOut, forms, resetDemo } = useVed();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const role = session?.role;
  const mine = visibleForms(forms, role, session?.name);
  const todo = mine.filter((f) => actionsFor(role ?? "user", f.status).length > 0).length;

  const refs = allowed(REFERENCES, role);
  const [refsOpen, setRefsOpen] = useState(() => refs.some((r) => r.to === pathname));

  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      active && "bg-muted text-foreground",
    );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <Link to="/demo/forms" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">Viletech ВЭД</span>
            <span className="mt-0.5 inline-block rounded bg-work-soft px-1.5 py-0.5 text-[10px] font-semibold text-work">
              Демо / моки
            </span>
          </span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          {allowed(NAV, role).map((item) => (
            <Link key={item.label} to={item.to} className={linkCls(pathname === item.to)}>
              {item.label}
              {item.to === "/demo/forms" && todo > 0 && (
                <span className="ml-2 rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground">{todo}</span>
              )}
            </Link>
          ))}

          {refs.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setRefsOpen((v) => !v)}
                className={cn("flex w-full items-center justify-between", linkCls(false))}
              >
                Справочники
                <span className="font-mono text-[11px]">{refsOpen ? "−" : "+"}</span>
              </button>
              {refsOpen && (
                <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-border pl-2">
                  {refs.map((item) => (
                    <Link key={item.to} to={item.to} className={cn(linkCls(pathname === item.to), "text-[13px]")}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-3">
          <div>
            <p className="label-caps">Роль (только демо)</p>
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
            <button
              type="button"
              onClick={resetDemo}
              className="w-full rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Сбросить данные
            </button>
          )}
          <Link
            to="/login"
            className="block w-full rounded-md px-3 py-2 text-center text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Войти через API (нужен core)
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate({ to: "/demo/login" });
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
            <div className="mb-1 lg:hidden">
              <span className="rounded bg-work-soft px-1.5 py-0.5 text-[10px] font-semibold text-work">Демо / моки</span>
            </div>
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
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
