import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — ВЭД от Вилетех" },
      { name: "description", content: "Вход в операционный контур платежей ВЭД: сделки, документы и платежи." },
      { property: "og:title", content: "Вход — ВЭД от Вилетех" },
      { property: "og:description", content: "Авторизация в платформе управления сделками и платежами." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("user@vdp.local");
  const [password, setPassword] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    void navigate({ to: "/dashboard" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Неверный e-mail или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-semibold tracking-tight">ВЭД от Вилетех</span>
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Вход в платформу</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seed: <span className="font-mono">*@vdp.local</span>, пароль = часть до @ (например user / manager).
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
              placeholder="user@vdp.local"
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
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/demo/login" className="font-semibold text-foreground hover:underline">
            Демо без бэкенда
          </Link>
        </p>
      </div>
    </div>
  );
}
