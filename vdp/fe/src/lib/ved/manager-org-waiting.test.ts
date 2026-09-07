import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { nextStepHint, waitingActorLabel } from "@/lib/api/mappers";

describe("manager org-waiting flow UX", () => {
  it("manager has no CTAs on organization_waiting_verification", () => {
    expect(actionsFor("manager", "organization_waiting_verification")).toEqual([]);
  });

  it("ICO owns the queue while manager gets guided next-step copy", () => {
    expect(actionsFor("internal_compliance_officer", "organization_waiting_verification").map((a) => a.id)).toContain(
      "ico_form_start",
    );
    expect(waitingActorLabel("organization_waiting_verification")).toContain("комплаенс");
    expect(nextStepHint("organization_waiting_verification", "manager")).toMatch(/Сейчас действует/);
  });
});
