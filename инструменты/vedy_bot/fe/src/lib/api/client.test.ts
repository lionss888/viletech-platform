import { describe, expect, it } from "vitest";
import { mapHitlCard, mapThreadMsg } from "./client";

describe("mapThreadMsg", () => {
  it("maps inbound telegram line", () => {
    const actual = mapThreadMsg({
      id: "1:2:in",
      direction: "in",
      from_user: "mgr",
      text: "hello",
      at: "2026-09-11T10:00:00Z",
      kind: "chat",
    });
    expect(actual.direction).toBe("in");
    expect(actual.author).toBe("mgr");
    expect(actual.summary).toBe("hello");
    expect(actual.channel).toBe("telegram");
  });

  it("maps agent error text", () => {
    const actual = mapThreadMsg({
      id: "a",
      direction: "agent",
      from_user: "agent",
      text: "Ошибка агента: нет CURSOR_API_KEY",
      at: "2026-09-11T10:00:00Z",
      kind: "ask_agent_error",
    });
    expect(actual.direction).toBe("agent");
    expect(actual.summary).toContain("Ошибка агента");
  });
});

describe("mapHitlCard", () => {
  it("maps awaiting card", () => {
    const actual = mapHitlCard({
      id: "card-1",
      status: "awaiting_approve",
      summary: "do thing",
      from_username: "bot",
    });
    expect(actual.id).toBe("card-1");
    expect(actual.status).toBe("awaiting_approve");
    expect(actual.text).toBe("do thing");
  });
});
