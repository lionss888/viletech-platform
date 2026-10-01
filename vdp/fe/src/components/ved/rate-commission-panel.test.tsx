import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvanceRateCommissionPanel } from "@/components/ved/AdvanceRateCommissionPanel";
import { RateCommissionPanel } from "@/components/ved/RateCommissionPanel";
import {
  currencyOptionsForSelect,
  isRateCommissionFormVisible,
} from "@/lib/ved/rate-commission-ui";

function withQuery(children: ReactNode): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe("rate-commission-ui", () => {
  it("keeps selected currency when catalog is empty", () => {
    const actual = currencyOptionsForSelect([], "eur");
    expect(actual).toEqual([{ code: "EUR", title: "EUR" }]);
  });

  it("dedupes catalog and keeps selected code", () => {
    const actual = currencyOptionsForSelect(
      [
        { code: "usd", title: "Dollar" },
        { code: "USD", title: "US Dollar" },
        { code: "CNY", title: "Yuan" },
      ],
      "RUB",
    );
    expect(actual.map((item) => item.code)).toEqual(["RUB", "USD", "CNY"]);
  });

  it("shows edit form only after Редактировать", () => {
    expect(isRateCommissionFormVisible(true, false)).toBe(false);
    expect(isRateCommissionFormVisible(true, true)).toBe(true);
    expect(isRateCommissionFormVisible(false, true)).toBe(false);
  });
});

describe("rate panels default widget", () => {
  it("AdvanceRateCommissionPanel starts as widget with Edit, no free-text currency", () => {
    const html = withQuery(
      <AdvanceRateCommissionPanel
        formId="f1"
        canEdit
        currency="USD"
        rate={{ value: "95.5", currency: "USD" }}
        commission={{ rewardMode: "percent", feePercent: "1.5", feeCurrency: "USD" }}
        currencies={[{ code: "USD", title: "US Dollar" }, { code: "CNY", title: "Yuan" }]}
      />,
    );
    expect(html).toContain("advance-rate-commission-widget");
    expect(html).toContain("Редактировать");
    expect(html).toContain("advance-rate-commission-edit-open");
    expect(html).not.toContain("advance-rate-commission-edit\"");
    expect(html).not.toContain('data-testid="advance-rate-input"');
    expect(html).not.toContain('type="text"');
  });

  it("RateCommissionPanel uses select testids only after edit is opened (hidden by default)", () => {
    const html = withQuery(
      <RateCommissionPanel
        formId="f1"
        canEdit
        currency="USD"
        currencies={[{ code: "USD", title: "US Dollar" }]}
      />,
    );
    expect(html).toContain("rate-commission-widget");
    expect(html).toContain("Редактировать");
    expect(html).not.toContain('data-testid="rate-currency"');
    expect(html).not.toContain('data-testid="rate-value"');
  });
});
