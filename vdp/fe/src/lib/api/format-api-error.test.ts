import { describe, expect, it } from "vitest";

import { ApiError } from "./client";
import { formatActionError, humanizeConflictMessage } from "./format-api-error";

describe("humanizeConflictMessage", () => {
  it("maps invoice-required conflict", () => {
    expect(humanizeConflictMessage("invoice document is required")).toContain("инвойса");
  });

  it("maps no-documents submit conflict", () => {
    expect(humanizeConflictMessage("cannot submit without documents; save as draft")).toContain("без документов");
  });

  it("maps generic Conflict", () => {
    expect(humanizeConflictMessage("Conflict")).toContain("конфликт состояния");
  });

  it("keeps unknown Russian or specific text", () => {
    expect(humanizeConflictMessage("Уже отправлено")).toBe("Уже отправлено");
  });
});

describe("formatActionError", () => {
  it("formats 409 ApiError", () => {
    const err = new ApiError(409, "CONFLICT", "invoice document is required");
    expect(formatActionError(err)).toContain("инвойса");
  });

  it("formats 401 ApiError", () => {
    expect(formatActionError(new ApiError(401, "UNAUTHORIZED", "no"))).toContain("Сессия истекла");
  });

  it("formats 403 ApiError", () => {
    expect(formatActionError(new ApiError(403, "FORBIDDEN", "no"))).toContain("прав");
  });

  it("falls back for plain Error", () => {
    expect(formatActionError(new Error("сеть недоступна"))).toBe("сеть недоступна");
  });
});
