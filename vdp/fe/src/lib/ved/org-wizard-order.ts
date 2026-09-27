/** Prefer seed / account org over probe E2E noise in wizard lists. */

const PROBE_ORG_NAME =
  /^(Inline Org|Persist Org|Deadend|Pilot Org|probe\b)/i;

const SEED_ORG_NAME = /ООО\s*Пример/i;

/** True when org looks like an E2E probe entity. */
export function isProbeOrganizationName(name: string | undefined): boolean {
  return Boolean(name && PROBE_ORG_NAME.test(name.trim()));
}

/** True when org is the compose seed client org. */
export function isSeedOrganizationName(name: string | undefined): boolean {
  return Boolean(name && SEED_ORG_NAME.test(name.trim()));
}

export type OrgSortable = { id: string; name: string };

/**
 * Sort organizations for the payment wizard: account org → seed «ООО Пример» →
 * other non-probe → probe last. Stable by name within a tier.
 */
export function sortOrganizationsForWizard<T extends OrgSortable>(
  organizations: readonly T[],
  preferredId?: string,
): T[] {
  const preferred = preferredId?.trim() || "";
  const rank = (org: T): number => {
    if (preferred && org.id === preferred) return 0;
    if (isSeedOrganizationName(org.name)) return 1;
    if (isProbeOrganizationName(org.name)) return 3;
    return 2;
  };
  return [...organizations].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "ru");
  });
}

/** Default organization id for a new wizard draft. */
export function defaultWizardOrganizationId<T extends OrgSortable>(
  organizations: readonly T[],
  preferredId?: string,
): string {
  const sorted = sortOrganizationsForWizard(organizations, preferredId);
  return sorted[0]?.id ?? "";
}
