import { Types } from 'mongoose';
import { IAccountRateSettings } from './rate-settings.interface';

/**
 * Single entry in rate settings change history (audit trail)
 */
export interface IAccountRateHistoryEntry {
  /**
   * When the change was made
   */
  changedAt: Date;

  /**
   * Who made the change (ROOT/ADMIN user ID)
   */
  changedBy: Types.ObjectId;

  /**
   * Complete snapshot of settings after this change
   * null indicates settings were removed (reverted to default)
   */
  settings: IAccountRateSettings[] | null;
}
