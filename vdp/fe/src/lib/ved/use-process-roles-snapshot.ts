import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getProcessRoles, type ProcessRoleRow, type ProcessRolesResponse } from "@/lib/api/process-roles";
import { usePlatformMode } from "@/lib/ved/platform-mode";

/** Shared React Query key for process-roles runtime snapshot. */
export const PROCESS_ROLES_QUERY_KEY = ["process-roles"] as const;

/**
 * Loads process-roles from core in app mode. Cabinets must use this snapshot
 * for CTA / next-step / counters so admin toggles are not decorative.
 */
export function useProcessRolesSnapshot() {
  const mode = usePlatformMode();
  return useQuery({
    queryKey: PROCESS_ROLES_QUERY_KEY,
    queryFn: getProcessRoles,
    enabled: mode === "app",
    staleTime: 30_000,
  });
}

/** Role rows for actionsFor / hints; undefined in demo or while unavailable. */
export function useProcessRolesRows(): ProcessRoleRow[] | undefined {
  const mode = usePlatformMode();
  const query = useProcessRolesSnapshot();
  if (mode !== "app") return undefined;
  return query.data?.roles;
}

/** Invalidate after admin PUT so cabinets pick up continuity without full reload. */
export async function invalidateProcessRolesSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: PROCESS_ROLES_QUERY_KEY });
}

export type { ProcessRolesResponse };
