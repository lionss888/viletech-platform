import type { VedRole } from "./types";

const TERMINAL_STATUS_RE = /^(completed|canceled)/i;

/** User/root/manager may upload deal docs except on terminal statuses. */
export function canUploadDocuments(status: string | undefined, role: VedRole | string | undefined): boolean {
  const st = status ?? "";
  if (!st || TERMINAL_STATUS_RE.test(st) || st.includes("canceled")) {
    return false;
  }
  return role === "user" || role === "root" || role === "manager";
}

/** Provider may delete own payment docs before provider_sent / later handoff. */
export function canProviderDeleteDocuments(status: string | undefined): boolean {
  const st = status ?? "";
  if (!st) return false;
  if (st === "payment_processing" || st === "payment_received" || st === "manager_checking") {
    return true;
  }
  return false;
}
