/**
 * Platform-owned intake console API client.
 * Preserved by make fe-sync (exclude src/lib/api/).
 */
import type { ConsoleMessage, HitlCard } from "@/lib/console-data";

const TOKEN_KEY = "intake_console_token";
const AGENT_KEY = "intake_cursor_api_key";

export type ThreadMsg = {
  id: string;
  message_id?: number;
  chat_id?: number;
  channel?: string;
  from_user?: string;
  direction: string;
  text: string;
  kind?: string;
  trigger?: string;
  at: string;
  attachments?: { id: string; name?: string; path?: string; mime?: string }[];
};

export type AgentJob = {
  id: string;
  status: string;
  mode: string;
  result?: string;
  error?: string;
};

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  const t = token.trim();
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAgentKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AGENT_KEY) || "";
}

export function setAgentKey(key: string): void {
  if (typeof window === "undefined") return;
  const k = key.trim();
  if (k) localStorage.setItem(AGENT_KEY, k);
  else localStorage.removeItem(AGENT_KEY);
}

export function isDemoMode(): boolean {
  return import.meta.env["VITE_INTAKE_DEMO"] === "1";
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.body && !(opts.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return undefined as T;
}

export function mapThreadMsg(m: ThreadMsg): ConsoleMessage {
  const direction =
    m.direction === "out" || m.direction === "agent" || m.direction === "in" ? m.direction : "in";
  const text = (m.text || "").trim();
  const isAgent = direction === "agent";
  let title: string | undefined;
  let summary = text;
  let note: string | undefined;
  let recommendations: string[] | undefined;
  if (isAgent && text.includes("---")) {
    const [head, ...rest] = text.split("---");
    note = (head ?? "").trim();
    summary = rest.join("---").trim() || text;
  }
  if (isAgent) {
    const lines = summary
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const firstLine = lines[0];
    if (
      firstLine?.includes("Локальный") ||
      firstLine?.includes("разбор") ||
      firstLine?.includes("Агент")
    ) {
      title = firstLine;
      summary = lines.slice(1).join("\n") || summary;
    }
    const recIdx = lines.findIndex((l) => /рекомендац/i.test(l));
    if (recIdx >= 0) {
      recommendations = lines
        .slice(recIdx + 1)
        .map((l) => l.replace(/^\d+\.\s*/, ""))
        .filter(Boolean);
    }
  }
  if (isAgent) {
    summary = formatAgentError(summary);
  }
  const mapped: ConsoleMessage = {
    id: m.id || `${m.chat_id}:${m.message_id}:${m.direction}`,
    timestamp: m.at || new Date().toISOString(),
    author: m.from_user || (direction === "agent" ? "agent" : "unknown"),
    channel: direction === "agent" ? "agent" : "telegram",
    event: m.kind || m.trigger || "message",
    direction,
    summary,
    tgChannel: m.channel || "manager",
  };
  if (m.message_id !== undefined) mapped.messageId = m.message_id;
  if (m.chat_id !== undefined) mapped.chatId = m.chat_id;
  if (title !== undefined) mapped.title = title;
  if (note !== undefined) mapped.note = note;
  if (recommendations !== undefined) mapped.recommendations = recommendations;
  return mapped;
}

export function mapHitlCard(raw: Record<string, unknown>): HitlCard {
  const status = String(raw["status"] || "awaiting_approve") as HitlCard["status"];
  const ok =
    status === "approved" || status === "awaiting_approve" || status === "rejected"
      ? status
      : "awaiting_approve";
  return {
    id: String(raw["id"] || ""),
    status: ok,
    author: String(raw["from_username"] || raw["author"] || "@bot"),
    text: String(raw["summary"] || raw["proposal"] || raw["text"] || ""),
  };
}

export async function fetchThread(limit = 200): Promise<ConsoleMessage[]> {
  const data = await api<{ items: ThreadMsg[] }>(`/api/thread?limit=${limit}`);
  return (data.items || []).map(mapThreadMsg);
}

export async function fetchCards(): Promise<HitlCard[]> {
  const data = await api<{ items: Record<string, unknown>[] }>("/api/cards");
  return (data.items || []).map(mapHitlCard);
}

export async function sendMessage(input: {
  text: string;
  asIntake: boolean;
  mirrorToTg: boolean;
  attachmentIds?: string[];
}): Promise<unknown> {
  return api("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      text: input.text,
      as_intake: input.asIntake,
      mirror_to_tg: input.mirrorToTg,
      attachment_ids: input.attachmentIds || [],
    }),
  });
}

export async function uploadFile(file: File): Promise<{ id: string; name?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return api("/api/upload", { method: "POST", body: fd });
}

export async function hitlDecide(cardId: string, approve: boolean): Promise<void> {
  await api("/api/hitl", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, approve, mirror_to_tg: true }),
  });
}

export async function startAgent(input: {
  mode: "analyze_selected" | "analyze_chat" | "ask_agent";
  messageIds: string[];
  prompt?: string;
  apiKey?: string;
  useKnowledge?: boolean;
}): Promise<AgentJob> {
  const key = (input.apiKey || getAgentKey()).trim();
  const problem = agentKeyProblem(key, getToken());
  if (problem) {
    throw new Error(problem);
  }
  return api("/api/agent", {
    method: "POST",
    body: JSON.stringify({
      mode: input.mode,
      message_ids: input.messageIds,
      prompt: input.prompt || "",
      api_key: input.apiKey || getAgentKey(),
      use_knowledge: !!input.useKnowledge,
    }),
  });
}

export async function getAgentJob(id: string): Promise<AgentJob> {
  return api(`/api/agent/${encodeURIComponent(id)}`);
}

export async function waitAgentJob(id: string, maxSec = 180): Promise<AgentJob> {
  for (let i = 0; i < maxSec; i++) {
    const job = await getAgentJob(id);
    if (job.status === "done" || job.status === "error") return job;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { id, status: "error", mode: "", error: "timeout" };
}

export async function savePrompt(text: string): Promise<{ path: string }> {
  return api("/api/to-cursor", {
    method: "POST",
    body: JSON.stringify({ text, mode: "prompt" }),
  });
}

export async function savePlan(text: string, cardId = ""): Promise<{ path: string }> {
  return api("/api/to-cursor", {
    method: "POST",
    body: JSON.stringify({ text, card_id: cardId, mode: "plan" }),
  });
}

export type PlanTodo = { id: string; content: string; status: string };
export type PlanDoc = {
  id?: string;
  name: string;
  overview: string;
  todos: PlanTodo[];
  isProject?: boolean;
  body?: string;
  path?: string;
  card_id?: string;
  status?: string;
};

export async function listPlans(cardId = ""): Promise<PlanDoc[]> {
  const q = cardId ? `?card_id=${encodeURIComponent(cardId)}` : "";
  const data = await api<{ items: PlanDoc[] }>(`/api/plans${q}`);
  return data.items || [];
}

export async function getPlan(id: string): Promise<PlanDoc> {
  return api(`/api/plans/${encodeURIComponent(id)}`);
}

export async function putPlan(id: string, doc: PlanDoc): Promise<PlanDoc> {
  return api(`/api/plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
}

export async function publishSelection(input: {
  text?: string;
  messageIds?: string[];
  target?: "manager" | "operator";
}): Promise<{ ok: boolean; text?: string }> {
  return api("/api/publish", {
    method: "POST",
    body: JSON.stringify({
      text: input.text || "",
      message_ids: input.messageIds || [],
      target: input.target || "manager",
    }),
  });
}

const AGENT_KEY_PREFIX_CANONICAL = "crsr_";
const AGENT_KEY_PREFIX_LEGACY = "key_";
const AGENT_KEY_CLOUD_REJECTED =
  "облако не приняло ключ — вставь полный User API Key из раздела API (crsr_…)";

export function hasAgentKeyPrefix(value: string): boolean {
  const key = value.trim().toLowerCase();
  return key.startsWith(AGENT_KEY_PREFIX_CANONICAL) || key.startsWith(AGENT_KEY_PREFIX_LEGACY);
}

export function formatAgentError(raw: string): string {
  const text = (raw || "").trim();
  if (/invalid user api key/i.test(text)) {
    return AGENT_KEY_CLOUD_REJECTED;
  }
  return text;
}

export function agentKeyProblem(agentKey: string, consoleToken: string): string | null {
  const agent = agentKey.trim();
  const token = consoleToken.trim();
  if (!agent) {
    return "нет ключа агента — вставь ключ в поле «Ключ агента»";
  }
  if (token && agent === token) {
    return "ключ агента совпадает с токеном консоли — нужен отдельный ключ агента";
  }
  return null;
}

export function formatHitlError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  if (/card not awaiting approve/i.test(text)) {
    return "карточка уже решена";
  }
  return text || "не удалось сохранить решение";
}

export function consoleKeyPresent(): boolean {
  return getToken().trim().length > 0;
}

export function agentKeyPresent(): boolean {
  return hasAgentKeyPrefix(getAgentKey());
}

/** Kind of agent key string (canonical crsr_ vs legacy key_). */
export function agentKeyKindOf(value: string): "crsr" | "key" | "none" {
  const key = value.trim().toLowerCase();
  if (key.startsWith(AGENT_KEY_PREFIX_CANONICAL)) return "crsr";
  if (key.startsWith(AGENT_KEY_PREFIX_LEGACY)) return "key";
  return "none";
}

/** Kind of stored agent key for header status. */
export function agentKeyKind(): "crsr" | "key" | "none" {
  return agentKeyKindOf(getAgentKey());
}

export function agentKeyStatusLabelOf(kind: "crsr" | "key" | "none"): string {
  switch (kind) {
    case "crsr":
      return "ключ crsr_ ок";
    case "key":
      return "ключ key_ (legacy)";
    default:
      return "без ключа";
  }
}

export function agentKeyStatusLabel(): string {
  return agentKeyStatusLabelOf(agentKeyKind());
}

export function consoleKeyStatusLabelOf(present: boolean): string {
  return present ? "Bearer ок" : "нет Bearer";
}

export function consoleKeyStatusLabel(): string {
  return consoleKeyStatusLabelOf(consoleKeyPresent());
}

export async function deleteTgMessage(messageId: number, chatId = 0): Promise<void> {
  await api("/api/tg/delete", {
    method: "POST",
    body: JSON.stringify({ message_id: messageId, chat_id: chatId }),
  });
}

export async function mgmtDone(input: {
  title: string;
  body?: string;
  next?: string;
}): Promise<unknown> {
  return api("/api/mgmt/done", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function checkAuth(): Promise<boolean> {
  try {
    await api("/api/thread?limit=1");
    return true;
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 401) return false;
    throw e;
  }
}
