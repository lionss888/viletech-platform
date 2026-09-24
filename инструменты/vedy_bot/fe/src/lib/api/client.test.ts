import { describe, expect, it } from "vitest";
import {
  agentKeyKindOf,
  agentKeyProblem,
  agentKeyStatusLabelOf,
  consoleKeyStatusLabelOf,
  formatAgentError,
  formatHitlError,
  hasAgentKeyPrefix,
  mapHitlCard,
  mapThreadMsg,
} from "./client";
import { isPlanTodoStatus, normalizePlanTodos, planEditorRoundTrip, preparePlanForSave } from "./plan-normalize";
import { composePublishText, formatPlanPublishSummary } from "./publish-compose";

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

  it("maps channel for manager/operator filter", () => {
    const op = mapThreadMsg({
      id: "o",
      direction: "out",
      channel: "operator",
      text: "digest",
      at: "2026-09-11T10:00:00Z",
    });
    expect(op.tgChannel).toBe("operator");
    const mgr = mapThreadMsg({
      id: "m",
      direction: "in",
      channel: "manager",
      text: "hi",
      at: "2026-09-11T10:00:00Z",
    });
    expect(mgr.tgChannel).toBe("manager");
  });

  it("keeps message_id for tg/delete", () => {
    const actual = mapThreadMsg({
      id: "x",
      message_id: 42,
      chat_id: -100,
      direction: "in",
      text: "hi",
      at: "2026-09-11T10:00:00Z",
    });
    expect(actual.messageId).toBe(42);
    expect(actual.chatId).toBe(-100);
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

describe("key status labels (AP2a header)", () => {
  it("reports separate console Bearer vs agent key labels", () => {
    expect(consoleKeyStatusLabelOf(false)).toBe("нет Bearer");
    expect(consoleKeyStatusLabelOf(true)).toBe("Bearer ок");
    expect(agentKeyKindOf("")).toBe("none");
    expect(agentKeyStatusLabelOf("none")).toBe("без ключа");
    expect(agentKeyKindOf("crsr_live")).toBe("crsr");
    expect(agentKeyStatusLabelOf("crsr")).toContain("crsr_");
    expect(agentKeyKindOf("key_legacy")).toBe("key");
    expect(agentKeyStatusLabelOf("key")).toContain("legacy");
    expect(hasAgentKeyPrefix("crsr_x")).toBe(true);
    expect(hasAgentKeyPrefix("tok")).toBe(false);
  });
});

describe("plan editor round-trip (AP3)", () => {
  it("normalizes empty ids and bogus statuses", () => {
    const actual = normalizePlanTodos([
      { id: "", content: "  first  ", status: "bogus" },
      { id: "keep", content: "ok", status: "completed" },
    ]);
    expect(actual[0]).toEqual({ id: "todo-1", content: "first", status: "pending" });
    expect(actual[1]).toEqual({ id: "keep", content: "ok", status: "completed" });
    expect(isPlanTodoStatus("in_progress")).toBe(true);
    expect(isPlanTodoStatus("running")).toBe(false);
  });

  it("round-trips editor edits into save payload", () => {
    const seed = {
      id: "api-plan-1",
      name: "API plan",
      overview: "seed",
      todos: [{ id: "t1", content: "first", status: "pending" }],
      body: "# Body",
      isProject: false,
    };
    const actual = planEditorRoundTrip(seed, {
      overview: 'updated: with colon and "quotes"',
      todos: [
        { id: "t1", content: "first", status: "completed" },
        { id: "", content: "  second  ", status: "in_progress" },
      ],
    });
    expect(actual.overview).toContain("colon");
    expect(actual.todos).toEqual([
      { id: "t1", content: "first", status: "completed" },
      { id: "todo-2", content: "second", status: "in_progress" },
    ]);
    expect(preparePlanForSave(actual).todos).toEqual(actual.todos);
  });
});

describe("selective publish compose (AP4)", () => {
  it("joins selection with optional plan summary", () => {
    expect(composePublishText({ selection: "a", includePlan: false, planSummary: "plan" })).toBe("a");
    expect(
      composePublishText({
        selection: "фрагмент",
        includePlan: true,
        planSummary: "План «X»:\noverview",
      }),
    ).toBe("фрагмент\n\nПлан «X»:\noverview");
    expect(composePublishText({ includePlan: true, planSummary: "only plan" })).toBe("only plan");
  });

  it("formats plan name and overview", () => {
    expect(formatPlanPublishSummary({ name: "AP4", overview: "кратко" })).toBe(
      "План «AP4»:\nкратко",
    );
    expect(formatPlanPublishSummary({ name: "AP4" })).toBe("План: AP4");
  });
});
