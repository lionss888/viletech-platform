import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  clearToken,
  fetchEnvironments,
  fetchMe,
  fetchReleases,
  loginLocal,
  promote,
  readToken,
  rollback,
  setApprovers,
  setSchedule,
  writeToken,
  type EnvironmentState,
  type Identity,
  type Release,
} from "./api";
import { StatusBadge } from "./StatusBadge";

type Page = "environments" | "releases" | "policy";

export function App() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [page, setPage] = useState<Page>("environments");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setReady(true);
      return;
    }
    fetchMe()
      .then(setIdentity)
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="login-wrap hint">Загрузка сессии…</div>;
  }

  if (!identity) {
    return <LoginPage onLogin={setIdentity} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>Поставка VDP</span>
        </div>
        <div className="stack">
          <button className={`nav-btn ${page === "environments" ? "active" : ""}`} onClick={() => setPage("environments")}>
            Среды
          </button>
          <button className={`nav-btn ${page === "releases" ? "active" : ""}`} onClick={() => setPage("releases")}>
            Обновления
          </button>
          <button className={`nav-btn ${page === "policy" ? "active" : ""}`} onClick={() => setPage("policy")}>
            Политика
          </button>
        </div>
        <p className="hint" style={{ marginTop: "1.5rem" }}>
          {identity.Subject} · {identity.Role}
        </p>
        <button
          className="btn btn-ghost"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            clearToken();
            setIdentity(null);
          }}
        >
          Выйти
        </button>
      </aside>
      <main className="main">
        {error ? <p className="error">{error}</p> : null}
        {page === "environments" ? <EnvironmentsPage onError={setError} /> : null}
        {page === "releases" ? <ReleasesPage identity={identity} onError={setError} /> : null}
        {page === "policy" ? <PolicyPage identity={identity} onError={setError} /> : null}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (id: Identity) => void }) {
  const [email, setEmail] = useState("alpha@vdp.local");
  const [password, setPassword] = useState("alpha");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await loginLocal(email, password);
      writeToken(result.token);
      onLogin(result.identity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="panel stack" style={{ width: "100%", maxWidth: 380 }} onSubmit={submit}>
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>Поставка VDP</span>
        </div>
        <h1>Вход в консоль поставки</h1>
        <p className="subtitle">Отдельное приложение. Не кабинет заявки.</p>
        <div>
          <label className="label-caps" htmlFor="email">
            E-mail
          </label>
          <input id="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label-caps" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Войти
        </button>
        <div className="row">
          <a className="btn btn-ghost" href="/api/v1/auth/github/start">
            GitHub OAuth
          </a>
          <a className="btn btn-ghost" href="/api/v1/auth/gitlab/start">
            GitLab OAuth
          </a>
        </div>
        <p className="hint">Порядок: GitHub OAuth, затем GitLab OAuth, затем локальные учётки.</p>
      </form>
    </div>
  );
}

function EnvironmentsPage({ onError }: { onError: (msg: string | null) => void }) {
  const [items, setItems] = useState<EnvironmentState[]>([]);

  useEffect(() => {
    fetchEnvironments()
      .then(setItems)
      .catch((err: Error) => onError(err.message));
  }, [onError]);

  return (
    <section>
      <h1>Среды</h1>
      <p className="subtitle">Текущий digest и режим расписания. Primary CTA — на экране обновлений.</p>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Среда</th>
              <th>Статус</th>
              <th>Digest / тег</th>
              <th>Режим</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            {items.map((env) => (
              <tr key={env.Name}>
                <td>{env.Name}</td>
                <td>
                  <StatusBadge status={env.Status} />
                </td>
                <td className="mono">{env.DigestTag || "—"}</td>
                <td>{env.Mode}</td>
                <td className="hint">{env.DisableHint || "доступно обновление"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReleasesPage({ identity, onError }: { identity: Identity; onError: (msg: string | null) => void }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [env, setEnv] = useState("alpha");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchReleases()
      .then(setReleases)
      .catch((err: Error) => onError(err.message));
  }, [onError]);

  const selected = useMemo(() => releases[0], [releases]);

  async function runPromote() {
    if (!selected) {
      return;
    }
    setPending(true);
    setMessage(null);
    onError(null);
    try {
      await promote(env, selected.ImagesRunID || "latest", selected.Tag);
      setMessage(`Обновление ${selected.Tag} отправлено на ${env}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "promote failed");
    } finally {
      setPending(false);
    }
  }

  async function runRollback() {
    if (!selected) {
      return;
    }
    setPending(true);
    onError(null);
    try {
      await rollback(env, selected.ImagesRunID || "latest", selected.Tag);
      setMessage(`Откат ${selected.Tag} на ${env}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "rollback failed");
    } finally {
      setPending(false);
    }
  }

  const disabledReason =
    env === "gamma" && identity.Role !== "deployer-gamma" && identity.Role !== "policy-admin"
      ? "роль не может обновлять gamma"
      : env === "gamma" && selected && !selected.IsProduct
        ? "на gamma только тег vdp-v"
        : !selected
          ? "нет обновлений в каталоге"
          : "";

  return (
    <section>
      <h1>Обновления</h1>
      <p className="subtitle">Каталог из GitHub Releases. Кнопка не собирает код заново.</p>
      <div className="panel stack">
        <div className="row">
          <label className="label-caps" htmlFor="env">
            Среда
          </label>
          <select id="env" className="field" style={{ maxWidth: 200 }} value={env} onChange={(e) => setEnv(e.target.value)}>
            <option value="alpha">alpha</option>
            <option value="beta">beta</option>
            <option value="gamma">gamma</option>
            <option value="demo">demo</option>
            <option value="test">test</option>
          </select>
          <button
            className="btn btn-primary"
            data-testid="promote-button"
            disabled={pending || Boolean(disabledReason)}
            title={disabledReason}
            onClick={() => void runPromote()}
          >
            Обновить
          </button>
          <button className="btn btn-ghost" disabled={pending || Boolean(disabledReason)} onClick={() => void runRollback()}>
            Откатить
          </button>
        </div>
        {disabledReason ? <p className="hint">Кнопка недоступна: {disabledReason}</p> : null}
        {message ? <p className="hint">{message}</p> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Тег</th>
              <th>Продуктовый</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((item) => (
              <tr key={item.Tag}>
                <td>{item.Title || item.Tag}</td>
                <td className="mono">{item.Tag}</td>
                <td>{item.IsProduct ? "да" : "нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PolicyPage({ identity, onError }: { identity: Identity; onError: (msg: string | null) => void }) {
  const [mode, setMode] = useState("button_or_window");
  const [window, setWindow] = useState("02:00-04:00");
  const [approvers, setApproversText] = useState("");
  const canEdit = identity.Role === "policy-admin";

  async function saveSchedule() {
    if (!canEdit) {
      onError("только policy-admin");
      return;
    }
    try {
      await setSchedule("beta", mode, window);
    } catch (err) {
      onError(err instanceof Error ? err.message : "schedule failed");
    }
  }

  async function saveApprovers() {
    if (!canEdit) {
      onError("только policy-admin");
      return;
    }
    try {
      await setApprovers(
        "gamma",
        approvers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "approvers failed");
    }
  }

  return (
    <section>
      <h1>Политика</h1>
      <p className="subtitle">Расписание и approver на gamma. Проверка на API, не только скрытие кнопки.</p>
      <div className="panel stack">
        <div>
          <label className="label-caps" htmlFor="mode">
            Режим beta
          </label>
          <input id="mode" className="field" value={mode} disabled={!canEdit} onChange={(e) => setMode(e.target.value)} />
        </div>
        <div>
          <label className="label-caps" htmlFor="window">
            Окно UTC
          </label>
          <input id="window" className="field" value={window} disabled={!canEdit} onChange={(e) => setWindow(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!canEdit} onClick={() => void saveSchedule()}>
          Сохранить расписание
        </button>
        <div>
          <label className="label-caps" htmlFor="approvers">
            Approvers gamma
          </label>
          <input
            id="approvers"
            className="field"
            value={approvers}
            disabled={!canEdit}
            onChange={(e) => setApproversText(e.target.value)}
            placeholder="login1,login2"
          />
        </div>
        <button className="btn btn-primary" disabled={!canEdit} onClick={() => void saveApprovers()}>
          Сохранить approvers
        </button>
      </div>
    </section>
  );
}
