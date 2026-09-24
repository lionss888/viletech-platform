/** Compose text for selective TG publish preview (AP4). */
export function composePublishText(input: {
  selection?: string;
  planSummary?: string;
  includePlan?: boolean;
}): string {
  const selection = String(input.selection || "").trim();
  const plan = input.includePlan ? String(input.planSummary || "").trim() : "";
  if (selection && plan) {
    return `${selection}\n\n${plan}`;
  }
  return selection || plan;
}

/** Format plan name+overview for optional publish append. */
export function formatPlanPublishSummary(input: {
  name?: string;
  overview?: string;
}): string {
  const name = String(input.name || "").trim();
  const overview = String(input.overview || "").trim();
  if (!name && !overview) {
    return "";
  }
  if (!overview) {
    return `План: ${name}`;
  }
  if (!name) {
    return `Кратко по плану:\n${overview}`;
  }
  return `План «${name}»:\n${overview}`;
}
