import { ApiError } from "./client";

const CONFLICT_HINTS: { match: RegExp; text: string }[] = [
  {
    match: /cannot submit without documents/i,
    text: "Нельзя отправить без документов — загрузите PDF, затем повторите",
  },
  {
    match: /invoice document is required/i,
    text: "Нужен документ инвойса — загрузите PDF, затем повторите действие",
  },
  {
    match: /contract file is required/i,
    text: "Нужен файл договора — загрузите документ, затем повторите",
  },
  {
    match: /already has an accepted agency contract/i,
    text: "У организации уже есть принятый агентский договор",
  },
  {
    match: /illegal|transition|not allowed|cannot/i,
    text: "Действие недоступно в текущем статусе заявки. Обновите карточку",
  },
];

/** Maps known English conflict messages to cabinet Russian copy. */
export function humanizeConflictMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || /^conflict$/i.test(trimmed) || /^resource conflict$/i.test(trimmed)) {
    return "Действие сейчас недоступно: конфликт состояния заявки. Обновите карточку";
  }
  for (const hint of CONFLICT_HINTS) {
    if (hint.match.test(trimmed)) return hint.text;
  }
  return trimmed;
}

/**
 * User-facing text for ActionPanel / form actions from ApiError or generic Error.
 * 409 → conflict copy; 401 → session; 403 → rights.
 */
export function formatActionError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return humanizeConflictMessage(err.message);
    if (err.status === 401) return "Сессия истекла — войдите снова";
    if (err.status === 403) return "Недостаточно прав для этого действия";
    return err.message || "Не удалось выполнить действие";
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Не удалось выполнить действие";
}
