import { apiFetch } from "./client";

export type ProcessRoleInfluence = "actor" | "observer" | "none";

export type CapabilityCatalogEntry = {
  id: string;
  title: string;
  description: string;
};

export type ProcessRoleRow = {
  role: string;
  enabled: boolean;
  priority: number;
  influence: ProcessRoleInfluence;
  capabilities: string[];
  removable: boolean;
  mandatory: boolean;
};

export type ProcessRolesResponse = {
  version: number;
  updated_at?: string;
  updated_by?: string;
  roles: ProcessRoleRow[];
  capabilities: string[];
  capabilities_catalog?: CapabilityCatalogEntry[];
  system_capabilities?: string[];
  admin_system_by_role?: Record<string, string[]>;
  mandatory_roles: string[];
  note?: string;
};

export function getProcessRoles(): Promise<ProcessRolesResponse> {
  return apiFetch<ProcessRolesResponse>("/api/v1/process-roles");
}

export function updateProcessRole(
  role: string,
  body: {
    enabled?: boolean;
    mandatory?: boolean;
    influence?: ProcessRoleInfluence;
    capabilities?: string[];
  },
): Promise<{ version: number }> {
  return apiFetch(`/api/v1/admin/process-roles/${encodeURIComponent(role)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function updateProcessRolePriorities(order: string[]): Promise<{ version: number }> {
  return apiFetch("/api/v1/admin/process-roles/priorities", {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
}

export function updateSystemRole(role: string, systemCapabilities: string[]): Promise<{ status: string }> {
  return apiFetch(`/api/v1/admin/system-roles/${encodeURIComponent(role)}`, {
    method: "PUT",
    body: JSON.stringify({ system_capabilities: systemCapabilities }),
  });
}

/** Human label for influence value. */
export function influenceLabel(value: ProcessRoleInfluence): string {
  switch (value) {
    case "actor":
      return "Участник (может менять статус)";
    case "observer":
      return "Наблюдатель (без смены статуса)";
    case "none":
      return "Без влияния";
    default:
      return value;
  }
}

/** Resolve catalog entry for a capability id. */
export function findCapabilityLabel(
  catalog: CapabilityCatalogEntry[] | undefined,
  id: string,
): CapabilityCatalogEntry {
  const found = catalog?.find((item) => item.id === id);
  return found ?? { id, title: id, description: "" };
}
