import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approveOrganization,
  blockOrganization,
  unApproveOrganization,
  createAgent,
  createCounterparty,
  createCurrency,
  createHsCode,
  createOrganization,
  createAdminAccount,
  deleteCounterparty,
  deleteOrganization,
  patchAdminAccount,
  setCounterpartyApproval,
  updateCounterparty,
  updateOrganization,
} from "@/lib/api/catalog-mutations";
import {
  listAdminAccounts,
  listAgents,
  listCounterparties,
  listCurrencies,
  listHsCodes,
  listOrganizations,
} from "@/lib/api/catalog";
import {
  mapCoreAdminAccount,
  mapCoreAgent,
  mapCoreCounterparty,
  mapCoreCurrency,
  mapCoreHs,
  mapCoreOrganization,
  staticReferenceData,
} from "@/lib/api/catalog-mappers";
import { attachDocToForm, uploadFile } from "@/lib/api/files";
import { assignAgent, assignDeadline, setConfirmation } from "@/lib/api/form-assignments";
import {
  acceptContract,
  attachContract,
  rejectContract,
  resolveContractBranch,
  type ContractType,
} from "@/lib/api/contract";
import {
  attachRefundFile,
  confirmRefundSent,
  initRefund,
  refundCancel,
  refundStart,
  refundStop,
} from "@/lib/api/refund";
import {
  assignProvider,
  createForm,
  getForm,
  listForms,
  transitionForm,
} from "@/lib/api/forms";
import { mapCoreFormToPaymentForm } from "@/lib/api/mappers";
import { useAuth } from "@/lib/auth/session";
import { resolveDemoAction } from "@/lib/ved/action-bridge";
import { staticCatalogSeed } from "@/lib/ved/catalog-source";
import type { RefRecord, RegistryKey } from "@/lib/ved/registry";
import { REGISTRIES } from "@/lib/ved/registry";
import type { FormAction, PaymentForm, PlatformUser } from "@/lib/ved/types";
import type { VedStore } from "@/lib/ved/store";
import { useVed } from "@/lib/ved/store";
import { getPostCreateTransition } from "@/lib/ved/platform-create";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { planContractConfirm } from "@/lib/ved/manager-contract";
import { PAYMENT_START_PROVIDER_LOCK } from "@/lib/ved/manager-payment";

const STATIC_REF_KEY = "ved-app-static-ref-v1";

type ActionExtra = {
  reason?: string;
  fileName?: string;
  mark?: string;
  file?: File;
  providerId?: string;
  agentId?: string;
  deadline?: string;
  contractType?: ContractType;
  refundAmount?: string;
  refundCurrency?: string;
  confirmationHash?: string;
};

type StaticRefOverrides = Partial<Record<"countries" | "complianceTools", RefRecord[]>>;

function loadStaticOverrides(): StaticRefOverrides {
  try {
    const raw = localStorage.getItem(STATIC_REF_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StaticRefOverrides;
  } catch {
    return {};
  }
}

function saveStaticOverrides(data: StaticRefOverrides): void {
  localStorage.setItem(STATIC_REF_KEY, JSON.stringify(data));
}

function useApiPlatformStore(): VedStore {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const staticRef = staticReferenceData();
  const enabled = auth.isAuthenticated;
  const [staticOverrides, setStaticOverrides] = useState<StaticRefOverrides>(() => loadStaticOverrides());

  useEffect(() => {
    saveStaticOverrides(staticOverrides);
  }, [staticOverrides]);

  const formsQuery = useQuery({ queryKey: ["forms"], queryFn: listForms, enabled });
  const orgsQuery = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations, enabled });
  const cpQuery = useQuery({ queryKey: ["counterparties"], queryFn: listCounterparties, enabled });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: listAgents, enabled });
  const currenciesQuery = useQuery({ queryKey: ["currencies"], queryFn: listCurrencies, enabled });
  const hsQuery = useQuery({ queryKey: ["hs-codes"], queryFn: listHsCodes, enabled });
  const usersQuery = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: listAdminAccounts,
    enabled: enabled && (auth.role === "root" || auth.role === "manager"),
  });

  const session = useMemo(
    () => (auth.role ? { role: auth.role, name: auth.displayName, email: auth.email } : null),
    [auth.role, auth.displayName, auth.email],
  );

  const forms = useMemo(
    () => (formsQuery.data ?? []).map((f) => mapCoreFormToPaymentForm(f, auth.displayName)),
    [formsQuery.data, auth.displayName],
  );

  const organizations = useMemo(() => (orgsQuery.data ?? []).map(mapCoreOrganization), [orgsQuery.data]);
  const counterparties = useMemo(() => (cpQuery.data ?? []).map(mapCoreCounterparty), [cpQuery.data]);
  const providers = useMemo(() => {
    const fromAccounts = (usersQuery.data ?? [])
      .filter((a) => a.role === "provider" && !a.blocked)
      .map((a) => ({
        id: a.id,
        name: a.full_name || a.email,
        country: "—",
        status: "active" as const,
      }));
    if (fromAccounts.length > 0) return fromAccounts;
    const fromApi = (agentsQuery.data ?? []).map(mapCoreAgent);
    return fromApi.length > 0 ? fromApi : staticRef.fallbackProviders;
  }, [agentsQuery.data, staticRef.fallbackProviders, usersQuery.data]);

  const paymentAgents = useMemo(() => {
    const fromApi = (agentsQuery.data ?? []).map(mapCoreAgent);
    return fromApi.length > 0 ? fromApi : staticRef.fallbackProviders;
  }, [agentsQuery.data, staticRef.fallbackProviders]);

  const currencies = useMemo(() => {
    const fromApi = (currenciesQuery.data ?? []).map(mapCoreCurrency);
    return fromApi.length > 0 ? fromApi : staticRef.fallbackCurrencies;
  }, [currenciesQuery.data, staticRef.fallbackCurrencies]);

  const hsCodes = useMemo(() => {
    const fromApi = (hsQuery.data ?? []).map(mapCoreHs);
    return fromApi.length > 0 ? fromApi : staticRef.fallbackHsCodes;
  }, [hsQuery.data, staticRef.fallbackHsCodes]);

  const countries = useMemo(
    () => (staticOverrides.countries as typeof staticRef.countries | undefined) ?? staticRef.countries,
    [staticOverrides.countries, staticRef.countries],
  );

  const complianceTools = useMemo(
    () =>
      (staticOverrides.complianceTools as typeof staticRef.complianceTools | undefined) ??
      staticRef.complianceTools,
    [staticOverrides.complianceTools, staticRef.complianceTools],
  );

  const users = useMemo(() => (usersQuery.data ?? []).map(mapCoreAdminAccount), [usersQuery.data]);

  const invalidateForms = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
  }, [queryClient]);

  const invalidateRegistry = useCallback(
    async (key: RegistryKey) => {
      const map: Partial<Record<RegistryKey, string[]>> = {
        organizations: ["organizations"],
        counterparties: ["counterparties"],
        providers: ["agents"],
        currencies: ["currencies"],
        hsCodes: ["hs-codes"],
      };
      const queries = map[key];
      if (!queries) return;
      await Promise.all(queries.map((q) => queryClient.invalidateQueries({ queryKey: [q] })));
    },
    [queryClient],
  );

  const applyAction = useCallback(
    async (formId: string, action: FormAction, extra: ActionExtra = {}) => {
      const resolved = resolveDemoAction(action.id);
      if (!resolved) {
        throw new Error(`Действие «${action.id}» недоступно в app-режиме`);
      }
      switch (resolved.kind) {
        case "assign_provider": {
          const providerId = extra.providerId ?? providers[0]?.id;
          if (!providerId) throw new Error("Выберите провайдера");
          await assignProvider(formId, providerId, true);
          break;
        }
        case "assign_agent": {
          const agentId = extra.agentId ?? paymentAgents[0]?.id;
          if (!agentId) throw new Error("Выберите платёжного агента");
          await assignAgent(formId, agentId);
          break;
        }
        case "assign_deadline": {
          if (!extra.deadline) throw new Error("Укажите срок исполнения");
          await assignDeadline(formId, extra.deadline);
          break;
        }
        case "contract_attach": {
          if (!extra.file) throw new Error("Выберите файл договора");
          const uploaded = await uploadFile(formId, extra.file);
          await attachContract(formId, uploaded.id, extra.contractType ?? "agency");
          break;
        }
        case "contract_resolve": {
          const current = await getForm(formId);
          const plan = planContractConfirm(current.status, current.contract_id || undefined);
          if (plan.kind === "resolve_branch") {
            await resolveContractBranch(formId);
            break;
          }
          if (plan.kind === "accept_then_send_order") {
            await acceptContract(plan.contractId);
          }
          await transitionForm(formId, "manager_send_order", { comment: extra.reason });
          break;
        }
        case "contract_return": {
          const current = await getForm(formId);
          const reason = extra.reason ?? "Возврат договора клиенту";
          if (current.contract_id) {
            await rejectContract(current.contract_id, reason);
            await resolveContractBranch(formId);
          } else if (
            current.status === "contract_verification" ||
            current.status === "contract_waiting"
          ) {
            await resolveContractBranch(formId);
          } else {
            await transitionForm(formId, "manager_form_reject", { comment: reason });
          }
          break;
        }
        case "refund_init": {
          const amount = extra.refundAmount ?? "0";
          const currency = extra.refundCurrency ?? "USD";
          await initRefund(formId, { amount, currency, comment: extra.reason });
          break;
        }
        case "refund_start":
          await refundStart(formId);
          break;
        case "refund_stop":
          await refundStop(formId);
          break;
        case "refund_sent":
          await confirmRefundSent(formId, extra.reason);
          break;
        case "refund_cancel":
          await refundCancel(formId);
          break;
        case "refund_file": {
          if (!extra.file) throw new Error("Выберите файл подтверждения");
          const uploaded = await uploadFile(formId, extra.file);
          await attachRefundFile(formId, uploaded.id);
          break;
        }
        case "set_confirmation": {
          const payload: { content?: string; file_id?: string } = {};
          if (extra.confirmationHash?.trim()) payload.content = extra.confirmationHash.trim();
          if (extra.file) {
            const uploaded = await uploadFile(formId, extra.file);
            payload.file_id = uploaded.id;
          }
          if (!payload.content && !payload.file_id) throw new Error("Прикрепите файл или укажите хеш");
          await setConfirmation(formId, payload);
          break;
        }
        case "file_then_transition": {
          if (extra.file) {
            const uploaded = await uploadFile(formId, extra.file);
            await attachDocToForm(formId, uploaded.id, resolved.docKind, extra.fileName);
          }
          await transitionForm(formId, resolved.coreAction, {
            comment: extra.reason,
            mark: extra.mark,
          });
          break;
        }
        case "file_attach": {
          if (!extra.file) throw new Error("Выберите файл");
          const uploaded = await uploadFile(formId, extra.file);
          await attachDocToForm(formId, uploaded.id, resolved.docKind, extra.fileName);
          break;
        }
        case "transition": {
          if (action.id === "mgr_payment_start") {
            const current = await getForm(formId);
            if (current.status === "payment_received" && !current.provider_id) {
              throw new Error(PAYMENT_START_PROVIDER_LOCK);
            }
          }
          await transitionForm(formId, resolved.coreAction, {
            comment: extra.reason,
            mark: extra.mark,
          });
          break;
        }
        default:
          throw new Error(`Неизвестный side-effect для «${action.id}»`);
      }
      await invalidateForms();
      await queryClient.invalidateQueries({ queryKey: ["form", formId] });
      if (
        resolved.kind === "refund_init" ||
        resolved.kind === "refund_start" ||
        resolved.kind === "refund_stop" ||
        resolved.kind === "refund_sent" ||
        resolved.kind === "refund_cancel" ||
        resolved.kind === "refund_file" ||
        resolved.kind === "assign_provider"
      ) {
        await queryClient.invalidateQueries({ queryKey: ["refund", formId] });
      }
    },
    [invalidateForms, paymentAgents, providers, queryClient],
  );

  const applyBulk = useCallback(
    (formIds: string[], action: FormAction, reason?: string) => {
      void Promise.all(formIds.map((id) => applyAction(id, action, { reason })));
    },
    [applyAction],
  );

  const createFormLocal = useCallback(
    async (draft: Partial<PaymentForm> & { invoiceFile?: File; contractFile?: File }): Promise<PaymentForm> => {
      const created = await createForm({
        direction: draft.direction ?? "import",
        kind: draft.kind ?? "good",
        invoice_amount: String((draft.amountMinor ?? 0) / 100),
        currency: draft.currency ?? "USD",
        no_documents: draft.noDocuments,
        contract_number: draft.invoiceNumber,
        contract_date: draft.shipmentDate,
        organization_id: draft.organizationId !== "—" ? draft.organizationId : undefined,
        counterparty_id: draft.counterpartyId !== "—" ? draft.counterpartyId : undefined,
      });
      if (draft.invoiceFile) {
        const uploaded = await uploadFile(created.id, draft.invoiceFile);
        await attachDocToForm(created.id, uploaded.id, "invoice", draft.invoiceFile.name);
      }
      if (draft.contractFile) {
        const uploaded = await uploadFile(created.id, draft.contractFile);
        await attachDocToForm(created.id, uploaded.id, "contract", draft.contractFile.name);
      }
      const postCreate = getPostCreateTransition("app");
      if (postCreate) {
        await transitionForm(created.id, postCreate);
      }
      await invalidateForms();
      const refreshed = postCreate ? await getForm(created.id) : created;
      return mapCoreFormToPaymentForm(refreshed, auth.displayName);
    },
    [auth.displayName, invalidateForms],
  );

  const saveRefRecord = useCallback(
    async (key: RegistryKey, record: RefRecord, originalId?: string) => {
      const def = REGISTRIES[key];
      const id = String(record[def.idField] ?? originalId ?? "");
      if (key === "countries" || key === "complianceTools") {
        setStaticOverrides((prev) => {
          const list = [...(prev[key] ?? (staticCatalogSeed()[key] as unknown as RefRecord[]))];
          const targetId = originalId ?? id;
          const at = list.findIndex((item) => String(item[def.idField]) === targetId);
          const nextRecord = { ...record, [def.idField]: id || targetId || `${key}-${Date.now()}` };
          if (at >= 0) list[at] = { ...list[at], ...nextRecord };
          else list.unshift(nextRecord);
          return { ...prev, [key]: list };
        });
        return;
      }
      if (key === "organizations") {
        const status = String(record.status ?? "");
        if (status === "approved" && id) {
          await approveOrganization(id);
        } else if (status === "blocked") {
          await blockOrganization(id);
        } else if ((status === "not_approved" || status === "waiting_verification") && id) {
          await unApproveOrganization(id);
        } else if (originalId) {
          await updateOrganization(originalId, {
            name: String(record.name ?? ""),
            inn: String(record.inn ?? ""),
          });
        } else {
          await createOrganization({
            name: String(record.name ?? ""),
            inn: String(record.inn ?? ""),
          });
        }
        await invalidateRegistry(key);
        return;
      }
      if (key === "counterparties") {
        const status = String(record.status ?? "");
        if (status === "approved" || status === "not_approved") {
          await setCounterpartyApproval(
            id,
            status === "approved" ? "approved" : "rejected",
            String(record.complianceNote ?? ""),
          );
        } else if (originalId) {
          await updateCounterparty(originalId, {
            name: String(record.name ?? ""),
            country: String(record.country ?? record.countryCode ?? ""),
            inn: String(record.inn ?? ""),
          });
        } else {
          await createCounterparty({
            name: String(record.name ?? ""),
            country: String(record.country ?? record.countryCode ?? ""),
            inn: String(record.inn ?? ""),
          });
        }
        await invalidateRegistry(key);
        return;
      }
      if (key === "providers") {
        await createAgent({ name: String(record.name ?? ""), status: String(record.status ?? "active") });
        await invalidateRegistry(key);
        return;
      }
      if (key === "currencies") {
        await createCurrency({ code: String(record.code ?? id), name: String(record.title ?? record.code ?? "") });
        await invalidateRegistry(key);
        return;
      }
      if (key === "hsCodes") {
        await createHsCode({ code: String(record.code ?? id), title: String(record.title ?? "") });
        await invalidateRegistry(key);
        return;
      }
    },
    [invalidateRegistry],
  );

  const deleteRefRecord = useCallback(
    async (key: RegistryKey, recordId: string) => {
      if (key === "countries" || key === "complianceTools") {
        setStaticOverrides((prev) => {
          const def = REGISTRIES[key];
          const list = [...(prev[key] ?? (staticCatalogSeed()[key] as unknown as RefRecord[]))];
          return { ...prev, [key]: list.filter((item) => String(item[def.idField]) !== recordId) };
        });
        return;
      }
      if (key === "organizations") {
        await deleteOrganization(recordId);
        await invalidateRegistry(key);
        return;
      }
      if (key === "counterparties") {
        await deleteCounterparty(recordId);
        await invalidateRegistry(key);
      }
    },
    [invalidateRegistry],
  );

  const importRefRecords = useCallback(
    async (key: RegistryKey, records: RefRecord[], mode: "append" | "replace") => {
      const errors: string[] = [];
      if (key === "countries" || key === "complianceTools") {
        setStaticOverrides((prev) => {
          const def = REGISTRIES[key];
          const base = mode === "replace" ? [] : [...(prev[key] ?? (staticCatalogSeed()[key] as unknown as RefRecord[]))];
          const stamped = records.map((record, index) => ({
            ...record,
            [def.idField]: String(record[def.idField] ?? "") || `${key}-${Date.now()}-${index}`,
          }));
          return { ...prev, [key]: mode === "replace" ? stamped : [...stamped, ...base] };
        });
        return;
      }
      for (const record of records) {
        try {
          await saveRefRecord(key, record);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : "import failed");
        }
      }
      if (errors.length > 0) throw new Error(`Импорт: ${errors.length} ошибок`);
    },
    [saveRefRecord],
  );

  const createUser = useCallback(
    async (draft: Omit<PlatformUser, "id" | "createdAt" | "blocked">) => {
      await createAdminAccount({
        email: draft.email,
        password: "ChangeMe2024!",
        role: draft.role,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    [queryClient],
  );

  const updateUser = useCallback(
    async (userId: string, patch: Partial<PlatformUser>) => {
      await patchAdminAccount(userId, {
        email: patch.email,
        role: patch.role,
        blocked: patch.blocked,
        full_name: patch.name ?? patch.email,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    [queryClient],
  );

  const toggleBlocked = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      await patchAdminAccount(userId, { blocked: !user.blocked });
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    [queryClient, users],
  );

  const refs = useMemo(
    () => ({
      organizations: organizations as unknown as RefRecord[],
      counterparties: counterparties as unknown as RefRecord[],
      providers: providers as unknown as RefRecord[],
      currencies: currencies as unknown as RefRecord[],
      hsCodes: hsCodes as unknown as RefRecord[],
      countries: countries as unknown as RefRecord[],
      complianceTools: complianceTools as unknown as RefRecord[],
    }),
    [complianceTools, countries, counterparties, currencies, hsCodes, organizations, providers],
  );

  return useMemo<VedStore>(
    () => ({
      ready: auth.ready && !formsQuery.isLoading,
      session,
      forms,
      users,
      refs,
      organizations,
      counterparties,
      providers,
      paymentAgents,
      currencies,
      hsCodes,
      countries,
      complianceTools,
      refRecords: (key: RegistryKey) => refs[key],
      saveRefRecord: saveRefRecord as VedStore["saveRefRecord"],
      deleteRefRecord: deleteRefRecord as VedStore["deleteRefRecord"],
      importRefRecords: importRefRecords as VedStore["importRefRecords"],
      signIn: (() => undefined) as VedStore["signIn"],
      signOut: (() => undefined) as VedStore["signOut"],
      applyAction: applyAction as VedStore["applyAction"],
      applyBulk,
      createForm: createFormLocal as unknown as VedStore["createForm"],
      toggleBlocked: toggleBlocked as VedStore["toggleBlocked"],
      createUser: createUser as VedStore["createUser"],
      updateUser: updateUser as VedStore["updateUser"],
      deleteUser: (() => undefined) as VedStore["deleteUser"],
      importUsers: (() => undefined) as VedStore["importUsers"],
      resetDemo: (() => undefined) as VedStore["resetDemo"],
    }),
    [
      applyAction,
      applyBulk,
      auth.ready,
      complianceTools,
      countries,
      createFormLocal,
      createUser,
      currencies,
      counterparties,
      deleteRefRecord,
      forms,
      formsQuery.isLoading,
      hsCodes,
      importRefRecords,
      organizations,
      providers,
      paymentAgents,
      refs,
      saveRefRecord,
      session,
      toggleBlocked,
      updateUser,
      users,
    ],
  );
}

/** Unified data layer: demo localStorage or core API depending on URL. */
export function usePlatformStore(): VedStore {
  const mode = usePlatformMode();
  const demo = useVed();
  const api = useApiPlatformStore();
  return mode === "demo" ? demo : api;
}

export function orgByIdFrom(organizations: VedStore["organizations"], id: string | undefined) {
  if (!id) return undefined;
  return organizations.find((o) => o.id === id);
}

export function cpByIdFrom(counterparties: VedStore["counterparties"], id: string | undefined) {
  if (!id) return undefined;
  return counterparties.find((c) => c.id === id);
}

export { visibleForms } from "@/lib/ved/store";
