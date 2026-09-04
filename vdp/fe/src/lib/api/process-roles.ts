import { apiFetch } from "./client";

export type ProcessRoleInfluence = "actor" | "observer" | "none";

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
  mandatory_roles: string[];
  note?: string;
};

export function getProcessRoles(): Promise<ProcessRolesResponse> {
  return apiFetch<ProcessRolesResponse>("/api/v1/process-roles");
}

export function updateProcessRole(
  role: string,
  body: { enabled?: boolean; influence?: ProcessRoleInfluence; capabilities?: string[] },
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
