import { describe, expect, it } from "vitest";

import { AUTO_RECOGNIZE_AFTER_CREATE, getPostCreateTransition } from "./platform-create";

describe("getPostCreateTransition", () => {
  it("returns recognize_complete in app mode", () => {
    expect(getPostCreateTransition("app")).toBe(AUTO_RECOGNIZE_AFTER_CREATE);
  });

  it("returns undefined in demo mode", () => {
    expect(getPostCreateTransition("demo")).toBeUndefined();
  });
});
