import type { BduiScreen } from '../types/bdui';
import { apiRequest, getAccessToken } from '../api/client';

/**
 * Loads a BDUI screen schema for the User role.
 */
export async function fetchUserScreen(page: string, status?: string): Promise<BduiScreen> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const needsAuth = page !== 'login';
  if (needsAuth && !getAccessToken()) {
    throw new Error('Unauthorized');
  }
  return apiRequest<BduiScreen>(`/bdui/schema/user/${page}${query}`, {
    auth: needsAuth,
  });
}
