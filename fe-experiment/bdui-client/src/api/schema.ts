import type { BduiScreen, BduiVedRoleId } from '../types/bdui';
import { apiRequest, getAccessToken, getBduiRole } from './client';

/**
 * Loads a BDUI screen schema for the active (or given) role.
 */
export async function fetchScreen(
  page: string,
  status?: string,
  role?: BduiVedRoleId,
): Promise<BduiScreen> {
  const resolvedRole = role ?? getBduiRole();
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const needsAuth = page !== 'login';
  if (needsAuth && !getAccessToken()) {
    throw new Error('Unauthorized');
  }
  return apiRequest<BduiScreen>(`/bdui/schema/${resolvedRole}/${page}${query}`, {
    auth: needsAuth,
  });
}

/** @deprecated Prefer fetchScreen — kept for call-site migration. */
export async function fetchUserScreen(page: string, status?: string): Promise<BduiScreen> {
  return fetchScreen(page, status, 'user');
}
