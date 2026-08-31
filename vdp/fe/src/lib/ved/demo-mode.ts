export const DEMO_STORAGE_KEY = "ved-demo-state-v2";
export const AUTH_STORAGE_KEY = "vdp-auth-v1";

export function isDemoPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function demoPath(appPath: string): string {
  if (appPath === "/") return "/demo";
  return `/demo${appPath}`;
}

export function appPathFromDemo(pathname: string): string {
  if (pathname === "/demo") return "/dashboard";
  if (pathname.startsWith("/demo/")) return pathname.slice(5) || "/dashboard";
  return pathname;
}
