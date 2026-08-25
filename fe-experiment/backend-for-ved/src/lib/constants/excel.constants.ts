/**
 * Лимиты для импорта Excel (защита от DoS)
 * Текущие шаблоны: 7-9 ячеек, лимиты дают запас 22× для будущих расширений
 */
export const EXCEL_LIMITS = {
  MAX_FILE_SIZE_MB: 15,
  MAX_TEMPLATE_CELLS: 200,
  PARSE_TIMEOUT_MS: 120000,
  SOCKET_QUEUE_RETRY: {
    ATTEMPTS: 5,
    BACKOFF_DELAY_MS: 1000,
    BACKOFF_TYPE: 'exponential' as const,
  },
} as const;

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function getMaxFileSizeBytes(): number {
  return EXCEL_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
}
