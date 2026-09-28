/** User submit CTAs that require at least one attached document. */
const USER_SUBMIT_IDS = new Set(["submit", "submit_corr", "accept_form"]);

export const SUBMIT_DOCS_REQUIRED_LOCK = "Нужен хотя бы один документ";

/** True for client submit / re-submit actions (app + demo ids). */
export function isUserSubmitAction(actionId: string): boolean {
  return USER_SUBMIT_IDS.has(actionId);
}

/** True when the form already has any attached document. */
export function hasAnyDocument(documents: { id?: string; kind?: string }[]): boolean {
  return documents.length > 0;
}

/** Lock primary submit when documents list is empty. */
export function blocksSubmitWithoutDocuments(
  actionId: string,
  documents: { id?: string; kind?: string }[],
): boolean {
  return isUserSubmitAction(actionId) && !hasAnyDocument(documents);
}
