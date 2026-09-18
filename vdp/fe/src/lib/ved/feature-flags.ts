import { useSyncExternalStore } from "react";

import type { VedRole } from "./types";

const STORAGE_KEY = "ved-feature-flags-v1";

/** Сегмент навигации → роли, которым раздел выключен. */
export type FeatureFlags = Record<string, VedRole[]>;

let cache: FeatureFlags | null = null;
const listeners = new Set<() => void>();

function readStorage(): FeatureFlags {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as FeatureFlags;
  } catch {
    return {};
  }
}

/** Feature flags snapshot (cached reference for useSyncExternalStore). */
export function getFeatureFlags(): FeatureFlags {
  if (!cache) cache = readStorage();
  return cache;
}

function write(next: FeatureFlags) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Reactive feature flags for components. */
export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(subscribe, getFeatureFlags, () => ({}));
}

/** Root всегда видит все разделы, чтобы не отрезать себе управление. */
export function isFeatureDisabled(flags: FeatureFlags, segment: string, role: VedRole | undefined): boolean {
  if (!role || role === "root") return false;
  return flags[segment]?.includes(role) ?? false;
}

/** Переключает доступ роли к разделу (сегменту навигации). */
export function toggleFeatureFlag(segment: string, role: VedRole): void {
  const current = getFeatureFlags();
  const list = current[segment] ?? [];
  const next = list.includes(role) ? list.filter((r) => r !== role) : [...list, role];
  write({ ...current, [segment]: next });
}
