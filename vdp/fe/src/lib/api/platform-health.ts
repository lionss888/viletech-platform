import { apiFetch } from "./client";

export type PlatformServiceState = "up" | "degraded" | "down";

export type PlatformServiceHealth = {
  id: string;
  name: string;
  state: PlatformServiceState;
  latency_ms: number;
  optional?: boolean;
  detail?: string;
};

export type PlatformHealthSignal = {
  id: string;
  label: string;
  value: string;
  tone: "ok" | "warn" | "critical" | "neutral" | string;
};

export type PlatformHealthSummary = {
  up: number;
  degraded: number;
  down: number;
  optional_down: number;
  total: number;
};

export type PlatformHealthSnapshot = {
  checked_at: string;
  environment: string;
  allows_mutating_runs: boolean;
  summary: PlatformHealthSummary;
  services: PlatformServiceHealth[];
  signals: PlatformHealthSignal[];
};

export function fetchPlatformHealth(): Promise<PlatformHealthSnapshot> {
  return apiFetch<PlatformHealthSnapshot>("/api/v1/admin/platform-health");
}
