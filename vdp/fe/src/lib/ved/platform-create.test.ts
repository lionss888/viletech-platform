import { describe, expect, it, vi } from "vitest";

import * as formsApi from "@/lib/api/forms";
import { createPlatformForm } from "./platform-create";

describe("platform-create", () => {
  it("creates form then recognize_complete", async () => {
    const createSpy = vi.spyOn(formsApi, "createFormApi").mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      account_id: "a",
      status: "creating",
      direction: "import",
      kind: "good",
      created_at: "",
      updated_at: "",
    });
    const transitionSpy = vi.spyOn(formsApi, "transitionFormApi").mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      account_id: "a",
      status: "draft",
      direction: "import",
      kind: "good",
      created_at: "",
      updated_at: "",
    });
    const result = await createPlatformForm("token", {
      invoiceAmount: "100",
      currency: "USD",
      contractNumber: "C-1",
      contractDate: "2026-08-01",
    });
    expect(createSpy).toHaveBeenCalled();
    expect(transitionSpy).toHaveBeenCalledWith(expect.any(String), result.id, "recognize_complete");
    expect(result.status).toBe("draft");
  });
});
