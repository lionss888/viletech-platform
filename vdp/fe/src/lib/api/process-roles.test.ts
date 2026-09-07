import { describe, expect, it } from "vitest";

import { findCapabilityLabel, influenceLabel } from "@/lib/api/process-roles";

describe("process role labels", () => {
  it("maps influence to human labels", () => {
    expect(influenceLabel("actor")).toContain("Участник");
    expect(influenceLabel("observer")).toContain("Наблюдатель");
    expect(influenceLabel("none")).toContain("Без влияния");
  });

  it("resolves catalog titles with fallback to id", () => {
    const catalog = [
      { id: "form.view", title: "Просмотр заявки", description: "Видеть карточку" },
    ];
    expect(findCapabilityLabel(catalog, "form.view").title).toBe("Просмотр заявки");
    expect(findCapabilityLabel(catalog, "unknown.cap").title).toBe("unknown.cap");
  });
});
