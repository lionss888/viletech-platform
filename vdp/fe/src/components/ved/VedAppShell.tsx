import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { useAuth } from "@/lib/auth/session";
import { actionsFor } from "@/lib/ved/actions";
import { filterNav, MAIN_NAV, REFERENCE_NAV } from "@/lib/ved/nav-config";
import { readRefsOpen, writeRefsOpen } from "@/lib/ved/nav-refs-open";
import { usePlatformBasePath, usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { ROLES, roleTitle } from "@/lib/ved/roles";
import { visibleForms } from "@/lib/ved/store";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

const CAN_CREATE: VedRole[] = ["user", "manager", "root"];

type AppRoute =
  | "/dashboard"
  | "/demo/dashboard"
  | "/forms"
  | "/demo/forms"
  | "/forms/new"
  | "/demo/forms/new"
  | "/documents"
  | "/demo/documents"
  | "/counterparties"
  | "/demo/counterparties";

export function VedAppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const mode = usePlatformMode();
  const base = usePlatformBasePath();
  const isDemo = mode === "demo";
  const auth = useAuth();
  const store = usePlatformStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const role = isDemo ? store.session?.role : auth.role;
  const displayName = isDemo ? store.session?.name : auth.displayName;
  const email = isDemo ? store.session?.email : auth.email;

  const [refsOpen, setRefsOpenState] = useState(() => readRefsOpen(false));
  const [supportOpen, setSupportOpen] = useState(false);

  const setRefsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    setRefsOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      writeRefsOpen(next);
      return next;
    });
  };

  if (!isDemo && !auth.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка сессии…</div>
    );
  }

  if (!isDemo && !auth.isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (isDemo && !store.session) {
    return <Navigate to="/demo/login" />;
  }

  const mine = visibleForms(store.forms, role, displayName);
  const todo = mine.filter((f) => actionsFor(role ?? "user", f.status).length > 0).length;

  const mainNav = filterNav(MAIN_NAV, role).filter((item) => item.segment !== "/forms/new");
  const refs = filterNav(REFERENCE_NAV, role);

  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      active && "bg-muted text-foreground",
    );

  const dashTo = `${base}/dashboard` as AppRoute;
  const formsNewTo = `${base}/forms/new` as AppRoute;
  const documentsTo = `${base}/documents` as AppRoute;
  const counterpartiesTo = `${base}/counterparties` as AppRoute;

  const footerText = isDemo
    ? `ВЭД от Вилетех · сделок в системе: ${store.forms.length}`
    : `ВЭД от Вилетех · сделок в системе: ${store.forms.length} · API · vdp/core · ${role ? roleTitle(role) : "—"}`;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar p-4 lg:flex">
        <Link to={dashTo} className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">ВЭД от Вилетех</span>
            {isDemo && (
              <span className="mt-0.5 inline-block rounded bg-work-soft px-1.5 py-0.5 text-[10px] font-semibold text-work">
                Демо / моки
              </span>
            )}
          </span>
        </Link>

        {role && CAN_CREATE.includes(role) && (
          <div className="mt-5">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                Создать
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Что нужно создать?</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: formsNewTo })}>Новая заявка</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: documentsTo })}>Добавить документ</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: counterpartiesTo })}>Добавить компанию</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSupportOpen(true)}>Поддержка и консультация</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-1">
          {mainNav.map((item) => {
            const to = `${base}${item.segment}` as AppRoute;
            const active = pathname === to;
            return (
              <Link key={`${item.segment}-${item.label}`} to={to} className={linkCls(active)}>
                {item.label}
                {item.segment === "/forms" && item.label.includes("Реестр") && todo > 0 && (
                  <span className="ml-2 rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground">{todo}</span>
                )}
              </Link>
            );
          })}

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
                  {refs.map((item) => {
                    const to = `${base}${item.segment}` as AppRoute;
                    return (
                      <Link key={item.segment} to={to} className={cn(linkCls(pathname === to), "text-[13px]")}>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-3">
          {isDemo ? (
            <>
              <div>
                <p className="label-caps">Роль (только демо)</p>
                <select
                  value={role ?? ""}
                  onChange={(e) => store.signIn(e.target.value as VedRole)}
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
                  onClick={store.resetDemo}
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
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Роль: <span className="font-semibold text-foreground">{role ? roleTitle(role) : "—"}</span>
              </p>
              <Link
                to="/demo/login"
                className="block w-full rounded-md px-3 py-2 text-center text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Демо без бэкенда
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={async () => {
              if (isDemo) {
                store.signOut();
                void navigate({ to: "/demo/login" });
              } else {
                await auth.logout();
                void navigate({ to: "/login" });
              }
            }}
            className="w-full rounded-md px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive-soft"
          >
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="min-w-0">
            {isDemo && (
              <div className="mb-1 lg:hidden">
                <span className="rounded bg-work-soft px-1.5 py-0.5 text-[10px] font-semibold text-work">Демо / моки</span>
              </div>
            )}
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">{displayName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{email}</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
              {(displayName ?? "?").slice(0, 1)}
            </span>
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {[...mainNav, ...refs].map((item) => {
            const to = `${base}${item.segment}` as AppRoute;
            return (
              <Link
                key={`${item.segment}-m-${item.label}`}
                to={to}
                className="rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 text-[11px] text-muted-foreground lg:px-6">
          {footerText}
        </footer>
      </div>

      <Modal
        open={supportOpen}
        onOpenChange={setSupportOpen}
        title="Поддержка и консультация"
        description="Напишите нам — специалист по сделкам ВЭД ответит в рабочее время."
        footer={<ModalButton onClick={() => setSupportOpen(false)}>Понятно</ModalButton>}
      >
        <div className="space-y-1 text-sm">
          <p>Почта: support@viletech.ru</p>
          <p>Телефон: +7 495 000-00-00</p>
          <p className="text-muted-foreground">Рабочие часы: пн–пт, 09:00–19:00 МСК</p>
        </div>
      </Modal>
    </div>
  );
}
