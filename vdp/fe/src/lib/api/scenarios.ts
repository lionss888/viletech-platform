import { apiFetch } from "./client";

export type ScenarioTag = "api" | "ui" | "smoke";

export type ScenarioStep = {
  id: string;
  title: string;
  expected_status?: string;
  role?: string;
};

export type ScenarioCatalogItem = {
  id: string;
  title: string;
  description: string;
  tags: ScenarioTag[];
  steps: ScenarioStep[];
};

export type ScenarioStepResult = {
  step_id: string;
  title: string;
  ok: boolean;
  expected_status?: string;
  actual_status?: string;
  detail?: string;
  duration_ms: number;
};

export type ScenarioRun = {
  id: string;
  scenario_id: string;
  mode: string;
  status: string;
  form_id?: string;
  steps: ScenarioStepResult[];
  error?: string;
  started_at: string;
  finished_at?: string;
  actor_id?: string;
};

export type ScenarioPolicy = {
  environment: string;
  allows_mutating_runs: boolean;
  default_mode: string;
};

export function fetchScenarioCatalog(): Promise<ScenarioCatalogItem[]> {
  return apiFetch<ScenarioCatalogItem[]>("/api/v1/admin/scenario-catalog");
}

export function fetchScenarioPolicy(): Promise<ScenarioPolicy> {
  return apiFetch<ScenarioPolicy>("/api/v1/admin/scenario-policy");
}

export function startScenarioRuns(input: {
  scenario_id?: string;
  scenario_ids?: string[];
  mode?: string;
}): Promise<{ runs: ScenarioRun[] }> {
  return apiFetch<{ runs: ScenarioRun[] }>("/api/v1/admin/scenario-runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listScenarioRuns(limit = 20): Promise<ScenarioRun[]> {
  const rows = await apiFetch<ScenarioRun[] | null>(`/api/v1/admin/scenario-runs?limit=${limit}`);
  return Array.isArray(rows) ? rows : [];
}

export function getScenarioRun(id: string): Promise<ScenarioRun> {
  return apiFetch<ScenarioRun>(`/api/v1/admin/scenario-runs/${id}`);
}

export type WipeProbeDataResult = {
  wiped_forms: number;
  allowed: boolean;
};

/** Root-only local cleanup: deletes all form payments (accounts kept). */
export function wipeProbeData(): Promise<WipeProbeDataResult> {
  return apiFetch<WipeProbeDataResult>("/api/v1/admin/probe-data/wipe", {
    method: "POST",
    body: "{}",
  });
}
