import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getAccount, login as apiLogin, logout as apiLogout, type AccountView } from "@/lib/api/auth";
import { clearAuthTokens, loadAuthTokens, type AuthTokens } from "@/lib/api/client";
import type { VedRole } from "@/lib/ved/types";

type AuthState = {
  ready: boolean;
  tokens: AuthTokens | null;
  account: AccountView | null;
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  role: VedRole | undefined;
  displayName: string;
  email: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function asVedRole(role: string | undefined): VedRole | undefined {
  if (!role) return undefined;
  const known: VedRole[] = [
    "user",
    "internal_compliance_officer",
    "compliance_officer",
    "manager",
    "provider",
    "root",
  ];
  return known.includes(role as VedRole) ? (role as VedRole) : undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    tokens: null,
    account: null,
  });

  const refreshAccount = useCallback(async () => {
    const tokens = loadAuthTokens();
    if (!tokens) {
      setState({ ready: true, tokens: null, account: null });
      return;
    }
    try {
      const account = await getAccount();
      setState({ ready: true, tokens, account });
    } catch {
      clearAuthTokens();
      setState({ ready: true, tokens: null, account: null });
    }
  }, []);

  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.tokens?.token),
      role: asVedRole(state.account?.role ?? state.tokens?.role),
      displayName: state.account?.full_name || state.account?.email || "—",
      email: state.account?.email || "",
      login: async (email, password) => {
        const tokens = await apiLogin(email, password);
        const account = await getAccount();
        setState({ ready: true, tokens, account });
      },
      logout: async () => {
        await apiLogout();
        setState({ ready: true, tokens: null, account: null });
      },
      refreshAccount,
    }),
    [state, refreshAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
