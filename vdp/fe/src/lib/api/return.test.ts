import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { getReturnEpisode, provReturnReport } from "./return";

const apiFetch = vi.fn();

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => apiFetch(...args),
  };
});

describe("getReturnEpisode", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("returns episode on 200 via apiFetch", async () => {
    const expected = { active: false };
    apiFetch.mockResolvedValueOnce(expected);
    const actual = await getReturnEpisode("form-1");
    expect(actual).toEqual(expected);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/forms/form-1/return/episode");
  });

  it("returns null on 404 ApiError", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(404, "not_found", "missing"));
    const actual = await getReturnEpisode("form-missing");
    expect(actual).toBeNull();
  });

  it("rethrows 401 ApiError", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(401, "unauthorized", "no token"));
    await expect(getReturnEpisode("form-1")).rejects.toMatchObject({ status: 401 });
  });
});

describe("provReturnReport", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("POSTs body through apiFetch", async () => {
    apiFetch.mockResolvedValueOnce({ ok: true });
    await provReturnReport("form-1", { amount: "10", currency: "USD" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/forms/form-1/return/report", {
      method: "POST",
      body: JSON.stringify({ amount: "10", currency: "USD" }),
    });
  });
});
