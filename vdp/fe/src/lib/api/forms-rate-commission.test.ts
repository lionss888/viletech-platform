import { afterEach, describe, expect, it, vi } from "vitest";

import { setCommission, setRate } from "./forms";

describe("setRate / setCommission (IMP5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("POSTs rate to /api/v1/forms/{id}/rate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "f1", rate: { value: "95.5", currency: "USD", source: "manual" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const form = await setRate("f1", { value: "95.5", currency: "USD" });
    expect(form.rate?.value).toBe("95.5");
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/forms/f1/rate");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { value: string; currency: string; source: string };
    expect(body).toEqual({ value: "95.5", currency: "USD", source: "manual" });
  });

  it("POSTs commission reward_mode=fixed to /api/v1/forms/{id}/commission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "f1",
        commission: { reward_mode: "fixed", fee_fix: "100", fee_amount: "100" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const form = await setCommission("f1", {
      reward_mode: "fixed",
      fee_fix: "100",
      fee_currency: "USD",
    });
    expect(form.commission?.reward_mode).toBe("fixed");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/forms/f1/commission");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.reward_mode).toBe("fixed");
    expect(body.fee_fix).toBe("100");
  });

  it("POSTs commission reward_mode=percent to /api/v1/forms/{id}/commission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "f1",
        commission: { reward_mode: "percent", fee_percent: "2.0", fee_amount: "100" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const form = await setCommission("f1", {
      reward_mode: "percent",
      fee_percent: "2.0",
      fee_currency: "USD",
    });
    expect(form.commission?.reward_mode).toBe("percent");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/forms/f1/commission");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.reward_mode).toBe("percent");
    expect(body.fee_percent).toBe("2.0");
  });

  it("POSTs commission reward_mode=percent_plus_fixed to /api/v1/forms/{id}/commission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "f1",
        commission: { reward_mode: "percent_plus_fixed", fee_percent: "1.5", fee_fix: "50", fee_amount: "200" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const form = await setCommission("f1", {
      reward_mode: "percent_plus_fixed",
      fee_percent: "1.5",
      fee_fix: "50",
      fee_currency: "USD",
    });
    expect(form.commission?.reward_mode).toBe("percent_plus_fixed");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/forms/f1/commission");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.reward_mode).toBe("percent_plus_fixed");
    expect(body.fee_percent).toBe("1.5");
    expect(body.fee_fix).toBe("50");
  });
});
