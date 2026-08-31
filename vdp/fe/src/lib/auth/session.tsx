import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { getAccountApi, loginApi, logoutApi, refreshApi } from "@/lib/api/auth";
import { setTokenRefreshHandler } from "@/lib/api/client";
import type { AccountProfile } from "@/lib/api/types";
import { AUTH_STORAGE_KEY } from "@/lib/ved/demo-mode";
import type { VedRole } from "@/lib/ved/types";

type StoredAuth = {
  token: string;
  refreshToken: string;
  accountId: string;
  role: VedRole;
  email: string;
  name: string;
};

type AuthContextValue = {
  ready: boolean;
  session: StoredAuth | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requireAuth: () => StoredAuth;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function writeStored(session: StoredAuth | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function profileToSession(profile: AccountProfile, token: string, refreshToken: string): StoredAuth {
  return {
    token,
    refreshToken,
    accountId: profile.id,
    role: profile.role,
    email: profile.email,
    name: profile.full_name || profile.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StoredAuth | null>(null);

  const persist = useCallback((next: StoredAuth | null) => {
    setSession(next);
    writeStored(next);
  }, []);

  useEffect(() => {
    setSession(readStored());
    setReady(true);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const current = readStored();
    if (!current?.refreshToken) return null;
    try {
      const refreshed = await refreshApi(current.refreshToken);
      const profile = await getAccountApi(refreshed.token);
      const next = profileToSession(profile, refreshed.token, refreshed.refresh_token);
      persist(next);
      return next.token;
    } catch {
      persist(null);
      return null;
    }
  }, [persist]);

  useEffect(() => {
    setTokenRefreshHandler(refresh);
    return () => setTokenRefreshHandler(null);
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await loginApi(email, password);
      const profile = await getAccountApi(auth.token);
      persist(profileToSession(profile, auth.token, auth.refresh_token));
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const token = readStored()?.token;
    persist(null);
    if (token) {
      try {
        await logoutApi(token);
      } catch {
        /* session cleared locally */
      }
    }
  }, [persist]);

  const requireAuth = useCallback((): StoredAuth => {
    if (!session) throw new Error("auth required");
    return session;
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      token: session?.token ?? null,
      login,
      logout,
      requireAuth,
    }),
    [ready, session, login, logout, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.ready && !auth.session) {
      void navigate({ to: "/login" });
    }
  }, [auth.ready, auth.session, navigate]);
  if (!auth.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>
    );
  }
  if (!auth.session) return null;
  return <>{children}</>;
}
