import { describe, expect, it } from "vitest";
import { agentKeyProblem, formatAgentError, formatHitlError, mapHitlCard, mapThreadMsg } from "./client";

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
      text: "Ошибка агента: нет ключа агента",
      at: "2026-09-11T10:00:00Z",
      kind: "ask_agent_error",
    });
    expect(actual.direction).toBe("agent");
    expect(actual.summary).toContain("Ошибка агента");
  });

  it("maps invalid agent key to operator text", () => {
    const actual = mapThreadMsg({
      id: "b",
      direction: "agent",
      from_user: "agent",
      text: "Ошибка агента: exit status 1: startup failed: Invalid User API Key",
      at: "2026-09-11T10:00:00Z",
      kind: "ask_agent_error",
    });
    expect(actual.summary).toContain("облако не приняло ключ");
    expect(actual.summary).not.toContain("Invalid User API Key");
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

describe("agent and hitl errors", () => {
  it("formats invalid agent key", () => {
    const actual = formatAgentError("exit status 1: Invalid User API Key");
    expect(actual).toContain("облако не приняло ключ");
    expect(actual).toContain("crsr_");
    expect(actual).not.toContain("Invalid User API Key");
  });

  it("rejects empty agent key and console token reuse", () => {
    expect(agentKeyProblem("", "tok")).toContain("нет ключа агента");
    expect(agentKeyProblem("tok", "tok")).toContain("совпадает с токеном консоли");
    expect(agentKeyProblem("key_abc", "tok")).toBeNull();
    expect(agentKeyProblem("crsr_abc", "tok")).toBeNull();
  });

  it("formats already decided card", () => {
    expect(formatHitlError(new Error("card not awaiting approve"))).toBe("карточка уже решена");
  });
});
