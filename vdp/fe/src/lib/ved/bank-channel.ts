/** Compose seed — bank client org (see `vdp/core/internal/repository/seed/seed.go`). */
export const BANK_ORG_ID = "88888888-8888-8888-8888-888888888888";

/** Exported constant: BANK_SEED_EMAIL. */
export const BANK_SEED_EMAIL = "bank@vdp.local";
/** Exported constant: BANK_SEED_PASSWORD. */
export const BANK_SEED_PASSWORD = "bank";

/** Predicate: isBankChannel. */
export function isBankChannel(channel: string | undefined): boolean {
  return channel === "bank";
}
