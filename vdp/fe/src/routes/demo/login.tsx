import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ROLES } from "@/lib/ved/roles";
import { useVed } from "@/lib/ved/store";

export const Route = createFileRoute("/demo/login")({
  component: DemoLoginPage,
});

function DemoLoginPage() {
  const { signIn } = useVed();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  function enter(roleId: (typeof ROLES)[number]["id"]) {
    setError(null);
    signIn(roleId);
    void navigate({ to: "/demo/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md panel p-5">
        <h1 className="text-xl font-semibold">Демо без бэкенда</h1>
        <p className="mt-2 text-sm text-muted-foreground">Выберите роль — данные сохраняются только в браузере.</p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-4 flex flex-col gap-2">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => enter(role.id)}
              className="rounded-md px-3 py-2 text-left text-sm font-semibold shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
            >
              {role.title}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/login" className="font-semibold underline">
            Войти в рабочий контур (API)
          </Link>
        </p>
      </div>
    </div>
  );
}
