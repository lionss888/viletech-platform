import { Injectable } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BduiVedRoleId } from '../bdui.constants';
import { BduiAction } from '../bdui.types';
import { getCatalogActions } from './lifecycle-action.catalog';
import { resolveLifecycleActionIds } from './lifecycle-action.matrix';

/**
 * Resolves BDUI actions for ВИ roles from the lifecycle matrix.
 */
@Injectable()
export class BduiLifecycleActionResolver {
  /**
   * Returns action ids for role + form status.
   */
  resolveActionIds(role: BduiVedRoleId, status: FormPaymentStatus | string | undefined): string[] {
    return resolveLifecycleActionIds(role, status);
  }

  /**
   * Returns full action descriptors for role + status.
   */
  resolveActions(role: BduiVedRoleId, status: FormPaymentStatus | string | undefined): BduiAction[] {
    return getCatalogActions(this.resolveActionIds(role, status));
  }
}
