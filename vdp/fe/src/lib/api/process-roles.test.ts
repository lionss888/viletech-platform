import { describe, expect, it } from "vitest";

import {
  findCapabilityLabel,
  influenceLabel,
  normalizeProcessRoles,
  type ProcessRolesResponse,
} from "@/lib/api/process-roles";

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

describe("normalizeProcessRoles", () => {
  it("coerces null capabilities on disabled roles to empty arrays", () => {
    const raw = {
      version: 3,
      roles: [
        {
          role: "treasurer",
          enabled: false,
          priority: 45,
          influence: "none",
          capabilities: null,
          removable: true,
          mandatory: false,
        },
      ],
      capabilities: null,
      mandatory_roles: ["user"],
    } as unknown as ProcessRolesResponse;
    const actual = normalizeProcessRoles(raw);
    expect(actual.capabilities).toEqual([]);
    expect(actual.roles[0]?.capabilities).toEqual([]);
  });
});
