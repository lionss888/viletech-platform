import type { PaymentForm } from "./types";

export type CurrencyTotal = {
  currency: string;
  sumMinor: number;
};

export type WorkTotals = {
  active: number;
  /** Currencies sorted by sum descending; empty when no active forms. */
  byCurrency: CurrencyTotal[];
};

/**
 * Sums active deal amounts per currency without FX conversion.
 * Mixing minor units across currencies is incorrect for money UI.
 */
export function workTotalsByCurrency(forms: PaymentForm[]): WorkTotals {
  const active = forms.filter((f) => !f.status.startsWith("canceled") && f.status !== "completed");
  const map = new Map<string, number>();
  for (const form of active) {
    map.set(form.currency, (map.get(form.currency) ?? 0) + form.amountMinor);
  }
  const byCurrency = [...map.entries()]
    .map(([currency, sumMinor]) => ({ currency, sumMinor }))
    .sort((a, b) => b.sumMinor - a.sumMinor || a.currency.localeCompare(b.currency));
  return { active: active.length, byCurrency };
}
