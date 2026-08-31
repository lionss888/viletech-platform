import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { VedStoreProvider } from "@/lib/ved/store";

export const Route = createFileRoute("/demo")({
  component: DemoLayout,
});

function DemoLayout() {
  return (
    <VedStoreProvider>
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:text-amber-100">
        Демо-режим: данные в localStorage, без подключения к API.{" "}
        <Link to="/login" className="font-semibold underline">
          Войти в рабочий контур
        </Link>
      </div>
      <Outlet />
    </VedStoreProvider>
  );
}
