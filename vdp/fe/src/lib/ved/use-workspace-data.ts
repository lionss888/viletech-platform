import { useMemo } from "react";

import { useAuth } from "@/lib/auth/session";
import { useVedOptional } from "@/lib/ved/store";
import { useIsDemoWorkspace } from "@/lib/ved/workspace";
import { usePlatformFormsState } from "@/lib/ved/use-platform-forms";
import type { Counterparty, Organization, PaymentForm, VedRole } from "@/lib/ved/types";

type WorkspaceSession = {
  role: VedRole;
  name: string;
  email: string;
};

export function useWorkspaceData(): {
  session: WorkspaceSession | null;
  forms: PaymentForm[];
  organizations: Organization[];
  counterparties: Counterparty[];
  isLoading: boolean;
} {
  const isDemo = useIsDemoWorkspace();
  const demo = useVedOptional();
  const platform = usePlatformFormsState();
  const auth = useAuth();
  const session = useMemo<WorkspaceSession | null>(() => {
    if (isDemo && demo?.session) {
      return { role: demo.session.role, name: demo.session.name, email: demo.session.email };
    }
    if (!isDemo && auth.session) {
      return { role: auth.session.role, name: auth.session.name, email: auth.session.email };
    }
    return null;
  }, [isDemo, demo?.session, auth.session]);
  return {
    session,
    forms: isDemo ? (demo?.forms ?? []) : platform.forms,
    organizations: isDemo ? (demo?.organizations ?? []) : [],
    counterparties: isDemo ? (demo?.counterparties ?? []) : [],
    isLoading: !isDemo && platform.isLoading,
  };
}
