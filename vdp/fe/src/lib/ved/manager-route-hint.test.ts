import { describe, expect, it } from "vitest";

import {
  MANAGER_ROUTE_HINT_BULLETS,
  MANAGER_ROUTE_HINT_LEAD,
  MANAGER_ROUTE_HINT_TITLE,
  shouldShowManagerRouteHint,
} from "./manager-route-hint";

describe("manager route hint", () => {
  it("shows for manager and root only", () => {
    expect(shouldShowManagerRouteHint("manager")).toBe(true);
    expect(shouldShowManagerRouteHint("root")).toBe(true);
    expect(shouldShowManagerRouteHint("user")).toBe(false);
    expect(shouldShowManagerRouteHint("provider")).toBe(false);
    expect(shouldShowManagerRouteHint("internal_compliance_officer")).toBe(false);
  });

  it("keeps approved product language without BPM promise", () => {
    expect(MANAGER_ROUTE_HINT_TITLE).toMatch(/путь заявки/i);
    expect(MANAGER_ROUTE_HINT_LEAD).toMatch(/готовых рычагов/i);
    expect(MANAGER_ROUTE_HINT_LEAD).not.toMatch(/BPM|конструктор всего/i);
    expect(MANAGER_ROUTE_HINT_BULLETS).toHaveLength(4);
    expect(MANAGER_ROUTE_HINT_BULLETS.some((line) => /суперадмин/i.test(line))).toBe(true);
    expect(MANAGER_ROUTE_HINT_BULLETS.some((line) => /отдельный кастом/i.test(line))).toBe(true);
    expect(MANAGER_ROUTE_HINT_BULLETS.every((line) => !/рисуй.*статус/i.test(line))).toBe(true);
  });
});
