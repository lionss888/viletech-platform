import { useRouterState } from "@tanstack/react-router";

import { isDemoPath } from "@/lib/ved/demo-mode";
import { useVedOptional } from "@/lib/ved/store";

export function useIsDemoWorkspace(): boolean {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return isDemoPath(pathname);
}

export function useWorkspaceBasePath(): string {
  return useIsDemoWorkspace() ? "/demo" : "";
}

export function useDemoStoreRequired() {
  const store = useVedOptional();
  if (!store) throw new Error("Demo store is not available outside /demo routes");
  return store;
}
