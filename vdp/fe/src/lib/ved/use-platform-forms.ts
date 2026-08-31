import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getFormHistoryApi, getFormApi, listFormsApi } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/session";
import { executeBridgeAction, type BridgeExtras } from "@/lib/ved/action-bridge";
import type { AppFormAction } from "@/lib/ved/app-actions";
import { historyToTimeline, mapCoreFormToPaymentForm } from "@/lib/ved/form-mapper";
import type { PaymentForm } from "@/lib/ved/types";

const FORMS_KEY = ["platform", "forms"] as const;

export function usePlatformForms() {
  const { token } = useAuth();
  return useQuery({
    queryKey: FORMS_KEY,
    enabled: !!token,
    queryFn: async () => {
      const rows = await listFormsApi(token!);
      return rows.map((row) => mapCoreFormToPaymentForm(row));
    },
  });
}

export function usePlatformForm(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...FORMS_KEY, id],
    enabled: !!token && !!id,
    queryFn: async () => {
      const form = await getFormApi(token!, id);
      const mapped = mapCoreFormToPaymentForm(form);
      try {
        const history = await getFormHistoryApi(token!, id);
        mapped.timeline = historyToTimeline(history);
      } catch {
        mapped.timeline = [];
      }
      return mapped;
    },
  });
}

export function usePlatformAction(formId: string) {
  const { token, session } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: AppFormAction; extras?: BridgeExtras }) => {
      if (!token || !session) throw new Error("auth required");
      return executeBridgeAction(token, session.role, formId, input.action, input.extras);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: FORMS_KEY });
      await client.invalidateQueries({ queryKey: [...FORMS_KEY, formId] });
    },
  });
}

export function useInvalidateForms() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: FORMS_KEY });
}

export type PlatformFormsState = {
  forms: PaymentForm[];
  isLoading: boolean;
  isError: boolean;
};

export function usePlatformFormsState(): PlatformFormsState {
  const query = usePlatformForms();
  return {
    forms: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
