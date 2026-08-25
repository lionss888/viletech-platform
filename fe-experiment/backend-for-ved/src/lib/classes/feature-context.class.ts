import { AccountRole } from '../enums/models/account.enums';

/**
 * Контекст запроса с информацией об аутентифицированном пользователе.
 * Используется для отслеживания кто инициировал действие в истории статусов и логах.
 */
export class FeatureContext {
  readonly accountId: string;
  readonly accountRoles: readonly AccountRole[];

  constructor(data: FeatureContext) {
    if (!data.accountId || typeof data.accountId !== 'string') {
      throw new Error('FeatureContext: accountId is required and must be a string');
    }

    if (!Array.isArray(data.accountRoles) || data.accountRoles.length === 0) {
      throw new Error('FeatureContext: accountRoles must be a non-empty array');
    }

    if (!data.accountRoles.every((role) => Object.values(AccountRole).includes(role))) {
      throw new Error('FeatureContext: all roles must be valid AccountRole values');
    }

    this.accountId = data.accountId;
    this.accountRoles = Object.freeze([...data.accountRoles]);
  }
}
