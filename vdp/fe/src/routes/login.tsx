import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — Viletech ВЭД" },
      { name: "description", content: "Вход в операционный контур через vdp/core." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("user@vdp.local");
  const [password, setPassword] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ready && isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email.trim(), password);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Не удалось войти. Проверьте, что vdp/core запущен.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-semibold tracking-tight">Viletech ВЭД</span>
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Вход через API</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Нужен запущенный <span className="font-mono">vdp/core</span> (compose :8080).
        </p>

        <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
          <div>
            <label htmlFor="email" className="label-caps">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field mt-1"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label-caps">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field mt-1"
              required
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Seed: <span className="font-mono">user@vdp.local</span> / <span className="font-mono">user</span>, также
          manager, ico, eco, provider.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/demo/login" className="font-semibold text-foreground hover:underline">
            Открыть демо без бэкенда
          </Link>
        </p>
      </div>
    </div>
  );
}
