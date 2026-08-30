import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { COUNTERPARTIES, FORMS, ORGANIZATIONS, USERS } from "./mock";
import { COMPLIANCE_TOOLS, COUNTRIES, CURRENCIES, HS_CODES, PROVIDERS } from "./reference";
import type { ComplianceToolRecord, CountryRecord, CurrencyRecord, HsCodeRecord, ProviderRecord } from "./reference";
import { REGISTRIES, type RefRecord, type RegistryKey } from "./registry";
import { ROLE_MAP } from "./roles";
import type { AttachedDocument, Counterparty, FormAction, Organization, PaymentForm, PlatformUser, VedRole } from "./types";

const STORAGE_KEY = "ved-demo-state-v2";

type Session = { role: VedRole; name: string; email: string } | null;

type Refs = Record<RegistryKey, RefRecord[]>;

type State = {
  session: Session;
  forms: PaymentForm[];
  users: PlatformUser[];
  refs: Refs;
};

type Store = State & {
  ready: boolean;
  organizations: Organization[];
  counterparties: Counterparty[];
  providers: ProviderRecord[];
  currencies: CurrencyRecord[];
  hsCodes: HsCodeRecord[];
  countries: CountryRecord[];
  complianceTools: ComplianceToolRecord[];
  refRecords: (key: RegistryKey) => RefRecord[];
  saveRefRecord: (key: RegistryKey, record: RefRecord, originalId?: string) => void;
  deleteRefRecord: (key: RegistryKey, id: string) => void;
  importRefRecords: (key: RegistryKey, records: RefRecord[], mode: "append" | "replace") => void;
  signIn: (role: VedRole) => void;
  signOut: () => void;
  applyAction: (formId: string, action: FormAction, extra?: { reason?: string; fileName?: string; mark?: string }) => void;
  applyBulk: (formIds: string[], action: FormAction, reason?: string) => void;
  createForm: (draft: Partial<PaymentForm>) => PaymentForm;
  addDocuments: (formId: string, files: { name: string; size: number }[], kind: AttachedDocument["kind"]) => number;
  deleteDocument: (formId: string, docId: string) => void;
  toggleBlocked: (userId: string) => void;
  createUser: (draft: Omit<PlatformUser, "id" | "createdAt" | "blocked">) => void;
  updateUser: (userId: string, patch: Partial<PlatformUser>) => void;
  deleteUser: (userId: string) => void;
  importUsers: (records: RefRecord[], mode: "append" | "replace") => void;
  resetDemo: () => void;
};


const initialRefs: Refs = {
  organizations: ORGANIZATIONS as unknown as RefRecord[],
  counterparties: COUNTERPARTIES as unknown as RefRecord[],
  providers: PROVIDERS as unknown as RefRecord[],
  currencies: CURRENCIES as unknown as RefRecord[],
  hsCodes: HS_CODES as unknown as RefRecord[],
  countries: COUNTRIES as unknown as RefRecord[],
  complianceTools: COMPLIANCE_TOOLS as unknown as RefRecord[],
};

const initialState: State = { session: null, forms: FORMS, users: USERS, refs: initialRefs };

const StoreContext = createContext<Store | null>(null);

export function VedStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<State>;
        setState({ ...initialState, ...saved, refs: { ...initialRefs, ...(saved.refs ?? {}) } });
      }
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
    (formId: string, action: FormAction, extra?: { reason?: string; fileName?: string; mark?: string }, actor?: VedRole) => {
      setState((prev) => ({
        ...prev,
        forms: prev.forms.map((form) => {
          if (form.id !== formId) return form;
          const at = new Date().toISOString();
          return {
            ...form,
            status: action.nextStatus,
            rejectText: action.requiresReason ? extra?.reason : undefined,
            rejectMark: action.requiresMark ? extra?.mark : undefined,
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
                title:
                  action.label +
                  (extra?.mark ? ` · ${extra.mark}` : "") +
                  (extra?.reason ? `: ${extra.reason}` : ""),
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
      organizations: state.refs.organizations as unknown as Organization[],
      counterparties: state.refs.counterparties as unknown as Counterparty[],
      providers: state.refs.providers as unknown as ProviderRecord[],
      currencies: state.refs.currencies as unknown as CurrencyRecord[],
      hsCodes: state.refs.hsCodes as unknown as HsCodeRecord[],
      countries: state.refs.countries as unknown as CountryRecord[],
      complianceTools: state.refs.complianceTools as unknown as ComplianceToolRecord[],
      refRecords: (key) => state.refs[key],
      saveRefRecord: (key, record, originalId) => {
        const def = REGISTRIES[key];
        setState((prev) => {
          const list = prev.refs[key];
          const id = String(record[def.idField] ?? "");
          const targetId = originalId ?? id;
          const exists = list.some((item) => String(item[def.idField]) === targetId);
          const next = exists
            ? list.map((item) => (String(item[def.idField]) === targetId ? { ...item, ...record } : item))
            : [{ ...record, [def.idField]: id || `${key}-${Date.now()}` }, ...list];
          return { ...prev, refs: { ...prev.refs, [key]: next } };
        });
      },
      deleteRefRecord: (key, id) => {
        const def = REGISTRIES[key];
        setState((prev) => ({
          ...prev,
          refs: { ...prev.refs, [key]: prev.refs[key].filter((item) => String(item[def.idField]) !== id) },
        }));
      },
      importRefRecords: (key, records, mode) => {
        const def = REGISTRIES[key];
        setState((prev) => {
          const stamped = records.map((record, index) => ({
            ...record,
            [def.idField]: String(record[def.idField] ?? "") || `${key}-${Date.now()}-${index}`,
          }));
          if (mode === "replace") return { ...prev, refs: { ...prev.refs, [key]: stamped } };
          const merged = [...prev.refs[key]];
          for (const record of stamped) {
            const at = merged.findIndex((item) => String(item[def.idField]) === String(record[def.idField]));
            if (at >= 0) merged[at] = { ...merged[at], ...record };
            else merged.unshift(record);
          }
          return { ...prev, refs: { ...prev.refs, [key]: merged } };
        });
      },
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
          organizationId: String(state.refs.organizations[0]?.['id'] ?? ORGANIZATIONS[0]!.id),
          counterpartyId: String(state.refs.counterparties[0]?.['id'] ?? COUNTERPARTIES[0]!.id),
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
      addDocuments: (formId, files, kind) => {
        const at = new Date().toISOString();
        const extOf = (name: string): AttachedDocument["ext"] => {
          const raw = name.split(".").pop()?.toUpperCase() ?? "";
          return raw === "JPG" || raw === "JPEG" || raw === "PNG"
            ? "JPG"
            : raw === "XLSX" || raw === "XLS" || raw === "CSV"
              ? "XLSX"
              : raw === "DOCX" || raw === "DOC"
                ? "DOCX"
                : "PDF";
        };
        const sizeOf = (bytes: number) =>
          bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
        setState((prev) => ({
          ...prev,
          forms: prev.forms.map((form) => {
            if (form.id !== formId) return form;
            const docs: AttachedDocument[] = files.map((file, index) => ({
              id: `${form.id}-doc-${Date.now()}-${index}`,
              title: file.name.replace(/\.[^.]+$/, ""),
              ext: extOf(file.name),
              size: sizeOf(file.size),
              uploadedAt: at,
              kind,
            }));
            return {
              ...form,
              updatedAt: at,
              documents: [...docs, ...form.documents],
              timeline: [
                ...form.timeline,
                {
                  id: `${form.id}-ev-${form.timeline.length + 1}`,
                  title: `Загружены документы (${docs.length})`,
                  at,
                  actorRole: prev.session?.role ?? "user",
                  done: true,
                },
              ],
            };
          }),
        }));
        return files.length;
      },
      deleteDocument: (formId, docId) =>
        setState((prev) => ({
          ...prev,
          forms: prev.forms.map((form) =>
            form.id === formId ? { ...form, documents: form.documents.filter((d) => d.id !== docId) } : form,
          ),
        })),
      toggleBlocked: (userId) =>
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, blocked: !u.blocked } : u)),
        })),
      createUser: (draft) =>
        setState((prev) => ({
          ...prev,
          users: [
            { ...draft, id: `u-new-${Date.now()}`, blocked: false, createdAt: new Date().toISOString() },
            ...prev.users,
          ],
        })),
      updateUser: (userId, patch) =>
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
        })),
      deleteUser: (userId) =>
        setState((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== userId) })),
      importUsers: (records, mode) =>
        setState((prev) => {
          const now = new Date().toISOString();
          const incoming: PlatformUser[] = records
            .filter((r) => String(r["name"] ?? "").trim() && String(r["email"] ?? "").trim())
            .map((r, index) => ({
              id: `u-imp-${Date.now()}-${index}`,
              name: String(r["name"]).trim(),
              email: String(r["email"]).trim(),
              role: (ROLE_MAP[String(r["role"]) as VedRole] ? String(r["role"]) : "user") as VedRole,
              organization: String(r["organization"] ?? "").trim() || undefined,
              blocked: false,
              createdAt: now,
            }));
          if (mode === "replace") return { ...prev, users: incoming };
          const merged = [...prev.users];
          for (const user of incoming) {
            const at = merged.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
            if (at >= 0) merged[at] = { ...merged[at]!, ...user, id: merged[at]!.id };
            else merged.unshift(user);
          }
          return { ...prev, users: merged };
        }),

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
