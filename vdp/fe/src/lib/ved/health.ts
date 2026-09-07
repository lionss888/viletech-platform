import type { PaymentForm } from "./types";

const DAY = 86_400_000;

export const STUCK_DAYS = 4;

export function isActive(form: PaymentForm): boolean {
  return !form.status.startsWith("canceled") && form.status !== "completed";
}

export function daysIdle(form: PaymentForm): number {
  return Math.floor((Date.now() - new Date(form.updatedAt).getTime()) / DAY);
}

/** «Зависшие» заявки: активные и без движения дольше STUCK_DAYS. */
export function stuckForms(forms: PaymentForm[], days = STUCK_DAYS): PaymentForm[] {
  return forms
    .filter((f) => isActive(f) && daysIdle(f) >= days)
    .sort((a, b) => daysIdle(b) - daysIdle(a));
}

export type Ranked = { name: string; count: number; sum: number };

function rank(forms: PaymentForm[], key: (f: PaymentForm) => string | undefined): Ranked[] {
  const map = new Map<string, Ranked>();
  forms.forEach((f) => {
    const name = key(f);
    if (!name) return;
    const cur = map.get(name) ?? { name, count: 0, sum: 0 };
    map.set(name, { name, count: cur.count + 1, sum: cur.sum + f.amountMinor });
  });
  return [...map.values()];
}

export function systemStats(
  forms: PaymentForm[],
  resolveManagerName?: (managerId: string) => string | undefined,
) {
  const managerLabel = (f: PaymentForm) =>
    f.managerName ?? (f.managerId ? resolveManagerName?.(f.managerId) ?? f.managerId : undefined);
  const byManager = rank(forms, managerLabel);
  const byClient = rank(forms, (f) => f.ownerName);
  const stuck = stuckForms(forms);

  const closedByManager = rank(
    forms.filter((f) => f.status === "completed"),
    managerLabel,
  );
  const stuckByManager = rank(stuck, managerLabel);

  const top = (list: Ranked[], by: "count" | "sum") =>
    [...list].sort((a, b) => b[by] - a[by])[0];

  return {
    active: forms.filter(isActive).length,
    total: forms.length,
    stuck,
    topManager: top(byManager, "count"),
    topClient: top(byClient, "sum"),
    bestEmployee: top(closedByManager, "count"),
    worstEmployee: top(stuckByManager, "count"),
  };
}
