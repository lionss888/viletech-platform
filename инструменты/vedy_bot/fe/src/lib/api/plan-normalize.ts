import type { PlanDoc, PlanTodo } from "./client";

const PLAN_TODO_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

export type PlanTodoStatus = (typeof PLAN_TODO_STATUSES)[number];

/** Whether status is a Cursor `.plan.md` todo status. */
export function isPlanTodoStatus(value: string): value is PlanTodoStatus {
  return (PLAN_TODO_STATUSES as readonly string[]).includes(value);
}

/**
 * Normalize todos for editor → PUT round-trip (ids, status, trim).
 * Mirrors Go planfile.Normalize.
 */
export function normalizePlanTodos(todos: PlanTodo[] | undefined): PlanTodo[] {
  return (todos || []).map((todo, index) => ({
    id: String(todo.id || "").trim() || `todo-${index + 1}`,
    content: String(todo.content || "").trim(),
    status: isPlanTodoStatus(todo.status) ? todo.status : "pending",
  }));
}

/** Prepare PlanDoc payload before PUT /api/plans/:id. */
export function preparePlanForSave(doc: PlanDoc): PlanDoc {
  return {
    ...doc,
    name: String(doc.name || "").trim(),
    overview: String(doc.overview || "").trim(),
    todos: normalizePlanTodos(doc.todos),
    body: doc.body ?? "",
    isProject: Boolean(doc.isProject),
  };
}

/**
 * Simulate editor round-trip: edit todos locally then prepare for save.
 * Used by unit tests; UI calls preparePlanForSave before putPlan.
 */
export function planEditorRoundTrip(doc: PlanDoc, edits: Partial<PlanDoc>): PlanDoc {
  return preparePlanForSave({ ...doc, ...edits, todos: edits.todos ?? doc.todos });
}
