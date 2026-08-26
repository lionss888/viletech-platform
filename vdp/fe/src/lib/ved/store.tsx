import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { COUNTERPARTIES, FORMS, ORGANIZATIONS, USERS } from "./mock";
import { ROLE_MAP } from "./roles";
import type { FormAction, PaymentForm, PlatformUser, VedRole } from "./types";

const STORAGE_KEY = "ved-demo-state-v1";

type Session = { role: VedRole; name: string; email: string } | null;

type State = {
  session: Session;
  forms: PaymentForm[];
  users: PlatformUser[];
};

type Store = State & {
  ready: boolean;
  organizations: typeof ORGANIZATIONS;
  counterparties: typeof COUNTERPARTIES;
  signIn: (role: VedRole) => void;
  signOut: () => void;
  applyAction: (formId: string, action: FormAction, extra?: { reason?: string; fileName?: string }) => void;
  applyBulk: (formIds: string[], action: FormAction, reason?: string) => void;
  createForm: (draft: Partial<PaymentForm>) => PaymentForm;
  toggleBlocked: (userId: string) => void;
  resetDemo: () => void;
};

const initialState: State = { session: null, forms: FORMS, users: USERS };

const StoreContext = createContext<Store | null>(null);

export function VedStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as State) });
    } catch {
      /* демо-состояние необязательно */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* игнорируем переполнение хранилища */
    }
  }, [state, ready]);

  const patchForm = useCallback(
    (formId: string, action: FormAction, extra?: { reason?: string; fileName?: string }, actor?: VedRole) => {
      setState((prev) => ({
        ...prev,
        forms: prev.forms.map((form) => {
          if (form.id !== formId) return form;
          const at = new Date().toISOString();
          return {
            ...form,
            status: action.nextStatus,
            rejectText: action.requiresReason ? extra?.reason : undefined,
            updatedAt: at,
            documents: extra?.fileName
              ? [
                  {
                    id: `${form.id}-doc-${form.documents.length + 1}`,
                    title: extra.fileName,
                    ext: "PDF" as const,
                    size: "—",
                    uploadedAt: at,
                    kind: "other" as const,
                  },
                  ...form.documents,
                ]
              : form.documents,
            timeline: [
              ...form.timeline,
              {
                id: `${form.id}-ev-${form.timeline.length + 1}`,
                title: action.label + (extra?.reason ? `: ${extra.reason}` : ""),
                at,
                actorRole: actor ?? "manager",
                done: true,
              },
            ],
          };
        }),
      }));
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      organizations: ORGANIZATIONS,
      counterparties: COUNTERPARTIES,
      signIn: (role) => {
        const meta = ROLE_MAP[role];
        setState((prev) => ({ ...prev, session: { role, name: meta.personName, email: meta.seedEmail } }));
      },
      signOut: () => setState((prev) => ({ ...prev, session: null })),
      applyAction: (formId, action, extra) => patchForm(formId, action, extra, state.session?.role),
      applyBulk: (ids, action, reason) =>
        ids.forEach((id) => patchForm(id, action, reason ? { reason } : undefined, state.session?.role)),
      createForm: (draft) => {
        const created: PaymentForm = {
          id: `form-new-${Date.now()}`,
          number: `ВЭД-2026-${Math.floor(2000 + Math.random() * 7999)}`,
          status: "draft",
          direction: "import",
          kind: "good",
          condition: "advance",
          amountMinor: 0,
          currency: "USD",
          organizationId: ORGANIZATIONS[0]!.id,
          counterpartyId: COUNTERPARTIES[0]!.id,
          hsCode: "—",
          invoiceNumber: "—",
          ownerName: state.session?.name ?? "Д. Морозов",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
          timeline: [
            {
              id: "tl-created",
              title: "Заявка создана",
              at: new Date().toISOString(),
              actorRole: state.session?.role ?? "user",
              done: true,
            },
          ],
          ...draft,
        };
        setState((prev) => ({ ...prev, forms: [created, ...prev.forms] }));
        return created;
      },
      toggleBlocked: (userId) =>
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, blocked: !u.blocked } : u)),
        })),
      resetDemo: () => {
        setState((prev) => ({ ...initialState, session: prev.session }));
      },
    }),
    [state, ready, patchForm],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useVed(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useVed должен вызываться внутри VedStoreProvider");
  return ctx;
}

/** Заявки, видимые роли (упрощённая модель прав из BDUI-контракта). */
export function visibleForms(forms: PaymentForm[], role: VedRole | undefined, ownerName?: string): PaymentForm[] {
  if (!role) return [];
  if (role === "user") return forms.filter((f) => f.ownerName === (ownerName ?? "Д. Морозов"));
  if (role === "provider") return forms.filter((f) => f.status.startsWith("payment"));
  if (role === "internal_compliance_officer")
    return forms.filter((f) => f.status.startsWith("organization") || f.status.startsWith("form") || f.status.startsWith("canceled"));
  if (role === "compliance_officer") return forms.filter((f) => f.status.startsWith("form") || f.status.startsWith("canceled"));
  return forms;
}
