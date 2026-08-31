import { useRouterState } from "@tanstack/react-router";

export type PlatformMode = "demo" | "app";

/** Контур UI: `/demo/*` — моки, остальное — JWT + core API. */
export function usePlatformMode(): PlatformMode {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname.startsWith("/demo") ? "demo" : "app";
}

export function usePlatformBasePath(): string {
  return usePlatformMode() === "demo" ? "/demo" : "";
}
