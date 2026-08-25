import { apiRequest } from '../api/client';
import type { BduiAction } from '../types/bdui';

export type BulkRunItemResult = {
  id: string;
  ok: boolean;
  error?: string;
};

export type BulkRunSummary = {
  succeeded: BulkRunItemResult[];
  failed: BulkRunItemResult[];
};

function parseApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ошибка';
  }
  const raw = error.message;
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join('; ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    /* plain text */
  }
  return raw;
}

/**
 * Runs an action sequentially for each row id (idempotent retries safe).
 */
export async function runBulkActionSequential(input: {
  action: BduiAction;
  pathParam: string;
  rowIds: string[];
  body?: Record<string, unknown>;
  maxCount: number;
}): Promise<BulkRunSummary> {
  const ids = input.rowIds.slice(0, input.maxCount);
  const succeeded: BulkRunItemResult[] = [];
  const failed: BulkRunItemResult[] = [];
  for (const id of ids) {
    try {
      let requestBody: Record<string, unknown> | undefined = input.body;
      if (input.action.staticBody) {
        requestBody = { ...input.action.staticBody, ...(requestBody ?? {}) };
      }
      await apiRequest(input.action.path, {
        method: input.action.method,
        body: requestBody,
        pathParams: { [input.pathParam]: id },
      });
      succeeded.push({ id, ok: true });
    } catch (error) {
      failed.push({ id, ok: false, error: parseApiError(error) });
    }
  }
  return { succeeded, failed };
}
