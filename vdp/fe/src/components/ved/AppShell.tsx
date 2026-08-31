import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { ROLES } from "@/lib/ved/roles";
import { useVed, visibleForms } from "@/lib/ved/store";
import { actionsFor } from "@/lib/ved/actions";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";

type NavItem = { to: string; label: string; roles: VedRole[] | "all" };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Рабочий стол", roles: "all" },
  { to: "/forms", label: "Реестр заявок", roles: ["user", "manager", "provider", "root"] },
  { to: "/forms", label: "Входящие заявки", roles: ["internal_compliance_officer", "compliance_officer"] },
  { to: "/organizations", label: "Проверка организаций", roles: ["internal_compliance_officer", "compliance_officer"] },
];

const REFERENCES: NavItem[] = [
  { to: "/documents", label: "Документы", roles: ["user", "manager", "provider", "root"] },
  { to: "/counterparties", label: "Контрагенты", roles: ["user", "manager", "root"] },
  { to: "/organizations", label: "Организации", roles: ["manager", "root"] },
  { to: "/compliance-tools", label: "Инструменты комплаенс", roles: ["root"] },
  { to: "/admin", label: "Пользователи", roles: ["root"] },
  { to: "/providers", label: "Провайдеры", roles: ["manager", "root"] },
  { to: "/codes", label: "Коды ТН ВЭД", roles: ["manager", "root"] },
  { to: "/currencies", label: "Валюты", roles: ["manager", "root"] },
  { to: "/countries", label: "Страны и риски", roles: ["root"] },
];

const CAN_CREATE: VedRole[] = ["user", "manager", "root"];


const allowed = (items: NavItem[], role: VedRole | undefined) =>
  items.filter((item) => item.roles === "all" || (role && item.roles.includes(role)));

export function AppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { session, signIn, signOut, forms, resetDemo } = useVed();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const role = session?.role;
  const mine = visibleForms(forms, role, session?.name);
  const todo = mine.filter((f) => actionsFor(role ?? "user", f.status).length > 0).length;

  const refs = allowed(REFERENCES, role);
  // Развёрнутое состояние «Справочники» хранится в localStorage и не сбрасывается при навигации/смене роли
  const [refsOpen, setRefsOpenState] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = window.localStorage.getItem("ved-nav-refs-open");
      if (saved !== null) return saved === "1";
    } catch { /* noop */ }
    return refs.some((r) => r.to === pathname);
  });
  const setRefsOpen = (v: boolean | ((p: boolean) => boolean)) => {
    setRefsOpenState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        window.localStorage.setItem("ved-nav-refs-open", next ? "1" : "0");
      } catch { /* noop */ }
      return next;
    });
  };
  const [supportOpen, setSupportOpen] = useState(false);


  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      active && "bg-muted text-foreground",
    );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar p-4 lg:flex">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-semibold tracking-tight">ВЭД от Вилетех</span>
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
                <DropdownMenuItem onSelect={() => navigate({ to: "/forms/new" })}>Новая заявка</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/documents" })}>Добавить документ</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/counterparties" })}>Добавить компанию</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSupportOpen(true)}>Поддержка и консультация</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-1">
          {allowed(NAV, role).map((item) => (
            <Link key={item.label} to={item.to} className={linkCls(pathname === item.to)}>
              {item.label}
              {item.to === "/forms" && todo > 0 && (
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
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

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {[...allowed(NAV, role), ...refs].map((item) => (
            <Link key={item.label} to={item.to} className="rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 text-[11px] text-muted-foreground lg:px-6">
          ВЭД от Вилетех · сделок в системе: {forms.length}
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
