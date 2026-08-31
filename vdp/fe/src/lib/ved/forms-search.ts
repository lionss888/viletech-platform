export type FormsSearch = {
  filter?: string | undefined;
  stage?: string | undefined;
  mine?: boolean | undefined;
  stuck?: boolean | undefined;
  q?: string | undefined;
};

export function parseFormsSearch(search: Record<string, unknown>): FormsSearch {
  return {
    filter: typeof search["filter"] === "string" ? search["filter"] : undefined,
    stage: typeof search["stage"] === "string" ? search["stage"] : undefined,
    mine: search["mine"] === true || search["mine"] === "true" ? true : undefined,
    stuck: search["stuck"] === true || search["stuck"] === "true" ? true : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  };
}
