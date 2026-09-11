#!/usr/bin/env node
/**
 * One-shot Cursor SDK bridge for intake console.
 * Env: CURSOR_API_KEY, INTAKE_WORKSPACE, INTAKE_AGENT_PROMPT
 * Prints final assistant text to stdout.
 */
import { Agent, CursorAgentError } from "@cursor/sdk";

const apiKey = process.env.CURSOR_API_KEY;
const cwd = process.env.INTAKE_WORKSPACE || process.cwd();
const prompt = process.env.INTAKE_AGENT_PROMPT || "";

if (!apiKey) {
  console.error("CURSOR_API_KEY required");
  process.exit(1);
}
if (!prompt.trim()) {
  console.error("INTAKE_AGENT_PROMPT required");
  process.exit(1);
}

const useCloud = process.env.INTAKE_AGENT_CLOUD === "1" || process.env.INTAKE_AGENT_CLOUD === "true";
const opts = {
  apiKey,
  model: { id: process.env.INTAKE_AGENT_MODEL || "composer-2.5" },
};
if (useCloud) {
  opts.cloud = { repos: [] };
} else {
  opts.local = { cwd };
}

try {
  const result = await Agent.prompt(prompt, opts);
  if (result.status === "error") {
    console.error("run failed", result.id);
    process.exit(2);
  }
  const text = result.result ?? result.text ?? JSON.stringify(result);
  process.stdout.write(String(text));
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("startup failed:", err.message);
    process.exit(1);
  }
  console.error(err?.message || err);
  process.exit(1);
}
