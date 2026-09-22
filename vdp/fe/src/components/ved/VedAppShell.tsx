import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalButton } from "@/components/ved/Modal";
import { RowNavContextMenu } from "@/components/ved/RowNavContextMenu";
import { useAuth } from "@/lib/auth/session";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { effectiveActionsFor, effectiveActionsFormCtx } from "@/lib/ved/effective-actions";
import {
  filterNav,
  filterNavGroups,
  filterReferenceFlat,
  flattenReferenceNav,
  MAIN_NAV,
  REFERENCE_GROUPS,
  REFERENCE_NAV,
} from "@/lib/ved/nav-config";
import { readRefsOpen, writeRefsOpen } from "@/lib/ved/nav-refs-open";
import { isFeatureDisabled, useFeatureFlags } from "@/lib/ved/feature-flags";
import { usePlatformBasePath, usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { ROLES, roleTitle } from "@/lib/ved/roles";
import { visibleForms } from "@/lib/ved/store";
import { useProcessRolesRows } from "@/lib/ved/use-process-roles-snapshot";
import { cn } from "@/lib/utils";
import type { VedRole } from "@/lib/ved/types";


type AppRoute = string;

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
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({});
  const [supportOpen, setSupportOpen] = useState(false);
  const processRoles = useProcessRolesRows();
  const flags = useFeatureFlags();

  const setRefsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    setRefsOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      writeRefsOpen(next);
      return next;
    });
  };

  function toggleNavGroup(groupId: string) {
    setOpenNavGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

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
  const todo = mine.filter(
    (f) => effectiveActionsFor(role ?? "user", effectiveActionsFormCtx(f), processRoles).length > 0,
  ).length;

  const mainNav = filterNav(MAIN_NAV, role).filter(
    (item) => item.segment !== "/forms/new" && !isFeatureDisabled(flags, item.segment, role),
  );
  const refGroups = filterNavGroups(REFERENCE_GROUPS, role)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !isFeatureDisabled(flags, item.segment, role)),
    }))
    .filter((group) => group.items.length > 0);
  const refFlat = filterReferenceFlat(role).filter((item) => !isFeatureDisabled(flags, item.segment, role));
  const refs = flattenReferenceNav(role).filter((item) => !isFeatureDisabled(flags, item.segment, role));
  const hasRefs = refGroups.length > 0 || refFlat.length > 0;

  // Прямой заход по ссылке в выключенный раздел: показываем заглушку вместо контента.
  const relPath = isDemo && pathname.startsWith("/demo") ? pathname.slice("/demo".length) || "/" : pathname;
  const matchedNav = [...MAIN_NAV, ...REFERENCE_NAV]
    .filter((item) => relPath === item.segment || relPath.startsWith(`${item.segment}/`))
    .sort((a, b) => b.segment.length - a.segment.length)[0];
  const sectionBlocked = Boolean(matchedNav && isFeatureDisabled(flags, matchedNav.segment, role));

  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      active && "bg-muted text-foreground",
    );

  const dashTo = `${base}/dashboard` as AppRoute;
  const formsNewTo = `${base}/forms/new` as AppRoute;

  const footerText = isDemo
    ? `${BRAND_NAME} · сделок в системе: ${store.forms.length}`
    : `${BRAND_NAME} · сделок в системе: ${store.forms.length} · API · vdp/core · ${role ? roleTitle(role) : "—"}`;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar p-4 lg:flex">
        <Link to={dashTo} className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            {BRAND_MARK}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
            {isDemo && (
              <span className="mt-0.5 inline-block rounded bg-work-soft px-1.5 py-0.5 text-[10px] font-semibold text-work">
                Демо / моки
              </span>
            )}
          </span>
        </Link>

        {role && (
          <div className="mt-5">
            <button
              type="button"
              data-testid="create-form-cta"
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => navigate({ to: formsNewTo })}
            >
              Создать заявку
            </button>
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

          {hasRefs && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setRefsOpen((v) => !v)}
                className={cn("flex w-full items-center justify-between", linkCls(false))}
                data-testid="nav-refs-toggle"
              >
                Справочники
                <span className="font-mono text-[11px]">{refsOpen ? "−" : "+"}</span>
              </button>
              {refsOpen && (
                <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-border pl-2">
                  {refGroups.map((group) => {
                    const groupOpen = Boolean(openNavGroups[group.id]);
                    return (
                      <div key={group.id} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleNavGroup(group.id)}
                          className={cn("flex w-full items-center justify-between", linkCls(false), "text-[13px]")}
                          data-testid={`nav-group-${group.id}`}
                        >
                          {group.label}
                          <span className="font-mono text-[11px]">{groupOpen ? "−" : "+"}</span>
                        </button>
                        {groupOpen && (
                          <div className="ml-2 flex flex-col gap-1 border-l border-border pl-2">
                            {group.items.map((item) => {
                              const to = `${base}${item.segment}` as AppRoute;
                              return (
                                <Link
                                  key={`${group.id}-${item.segment}`}
                                  to={to}
                                  className={cn(linkCls(pathname === to), "text-[13px]")}
                                  data-testid={`nav-leaf-${item.segment.replace(/^\//, "")}`}
                                >
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {refFlat.map((item) => {
                    const to = `${base}${item.segment}` as AppRoute;
                    return (
                      <Link
                        key={`flat-${item.segment}-${item.label}`}
                        to={to}
                        className={cn(linkCls(pathname === to), "text-[13px]")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-4 border-t border-border pt-4">
          {isDemo ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="label-caps">Роль · демо</p>
                <select
                  value={role ?? ""}
                  onChange={(e) => store.signIn(e.target.value as VedRole)}
                  className="field text-sm"
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
                  className="block w-full rounded-md px-0 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  Сбросить данные
                </button>
              )}
              <Link
                to="/login"
                className="block w-full rounded-md px-0 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
              >
                Войти через API (нужен core)
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="label-caps">Роль</p>
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {role ? roleTitle(role) : "—"}
                </p>
              </div>
              <Link
                to="/demo/login"
                className="block w-full rounded-md px-0 py-1.5 text-left text-xs leading-snug text-muted-foreground hover:text-foreground"
              >
                Открыть демо-контур
              </Link>
            </div>
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
            className="block w-full rounded-md px-0 py-1.5 text-left text-sm font-medium text-destructive hover:underline"
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
            <DropdownMenu>
              <DropdownMenuTrigger
                className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold hover:bg-border"
                title="Меню пользователя"
                aria-label="Меню пользователя"
              >
                {(displayName ?? "?").slice(0, 1)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => navigate({ to: `${base}/profile` as AppRoute })}>
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: `${base}/profile` as AppRoute })}>
                  Настройки
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {sectionBlocked ? (
            <div className="panel mx-auto max-w-md space-y-2 p-6 text-center">
              <p className="text-sm font-semibold">Раздел отключён</p>
              <p className="text-sm text-muted-foreground">
                Администратор выключил этот раздел для вашей роли. Если доступ нужен — обратитесь к администратору.
              </p>
            </div>
          ) : (
            <RowNavContextMenu basePath={base} role={role} onOpenRefs={() => setRefsOpen(true)}>
              {children}
            </RowNavContextMenu>
          )}
        </main>

        {role && (
          <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <button
              type="button"
              onClick={() => navigate({ to: formsNewTo })}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              data-testid="create-fab"
            >
              Создать заявку
            </button>
          </div>
        )}

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
          <p>Почта: support@vedy.io</p>
          <p>Телефон: +7 495 000-00-00</p>
          <p className="text-muted-foreground">Рабочие часы: пн–пт, 09:00–19:00 МСК</p>
        </div>
      </Modal>
    </div>
  );
}
