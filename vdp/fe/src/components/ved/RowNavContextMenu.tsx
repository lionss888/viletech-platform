import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { filterNav, REFERENCE_NAV } from "@/lib/ved/nav-config";
import { writeRefsOpen } from "@/lib/ved/nav-refs-open";
import type { VedRole } from "@/lib/ved/types";

type AppRoute =
  | "/chats"
  | "/demo/chats"
  | "/profile"
  | "/demo/profile"
  | "/documents"
  | "/demo/documents"
  | "/counterparties"
  | "/demo/counterparties"
  | "/organizations"
  | "/demo/organizations"
  | "/compliance-tools"
  | "/demo/compliance-tools"
  | "/admin"
  | "/demo/admin"
  | "/process-roles"
  | "/demo/process-roles"
  | "/providers"
  | "/demo/providers"
  | "/codes"
  | "/demo/codes"
  | "/currencies"
  | "/demo/currencies"
  | "/countries"
  | "/demo/countries"
  | "/testing"
  | "/demo/testing";

type MenuPoint = { x: number; y: number };

/**
 * Optional quick-nav menu only on elements marked `data-row-menu`.
 * Table cells (td/tr) do not open this menu — row click navigates to the form.
 * Profile remains in the shell header.
 */
export function RowNavContextMenu({
  basePath,
  role,
  onOpenRefs,
  children,
}: {
  basePath: string;
  role: VedRole | undefined;
  onOpenRefs?: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [point, setPoint] = useState<MenuPoint | null>(null);
  const refs = useMemo(() => filterNav(REFERENCE_NAV, role), [role]);

  const close = useCallback(() => setPoint(null), []);

  const go = useCallback(
    (segment: string) => {
      close();
      void navigate({ to: `${basePath}${segment}` as AppRoute });
    },
    [basePath, close, navigate],
  );

  const openRefs = useCallback(() => {
    writeRefsOpen(true);
    onOpenRefs?.();
    const first = refs[0];
    if (first) {
      go(first.segment);
      return;
    }
    close();
  }, [close, go, onOpenRefs, refs]);

  const openAt = useCallback((event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest("a, button, input, textarea, select, [data-no-row-menu]")) return false;
    const trigger = target.closest("[data-row-menu]");
    if (!trigger || !rootRef.current?.contains(trigger)) return false;
    if (trigger.closest("table, thead, tbody, tfoot, tr, td, th")) return false;
    event.preventDefault();
    event.stopPropagation();
    setPoint({ x: event.clientX, y: event.clientY });
    return true;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onContextMenu = (event: MouseEvent) => {
      openAt(event);
    };
    root.addEventListener("contextmenu", onContextMenu);
    return () => {
      root.removeEventListener("contextmenu", onContextMenu);
    };
  }, [openAt]);

  useEffect(() => {
    if (!point) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, point]);

  const itemCls =
    "w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <>
      <div ref={rootRef}>{children}</div>
      {point && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Быстрый переход"
          className="fixed z-50 min-w-[11rem] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: point.x, top: point.y }}
        >
          <button type="button" role="menuitem" className={itemCls} onClick={() => go("/chats")}>
            Рабочие чаты
          </button>
          <button type="button" role="menuitem" className={itemCls} onClick={() => go("/profile")}>
            Профиль
          </button>
          <button type="button" role="menuitem" className={itemCls} onClick={openRefs} disabled={refs.length === 0}>
            Справочники
          </button>
        </div>
      )}
    </>
  );
}
