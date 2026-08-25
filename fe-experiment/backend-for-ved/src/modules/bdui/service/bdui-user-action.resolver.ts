import { Injectable } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BDUI_ROLE_USER } from '../bdui.constants';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';

/**
 * User-facing wrapper over the lifecycle matrix (keeps existing call sites).
 */
@Injectable()
export class BduiUserActionResolver {
  constructor(private readonly lifecycleResolver: BduiLifecycleActionResolver) {}

  /**
   * Returns action ids available to the User role for the given form status.
   */
  resolveActionIds(status: FormPaymentStatus | string | undefined): string[] {
    return this.lifecycleResolver.resolveActionIds(BDUI_ROLE_USER, status);
  }

  canSubmit(status: FormPaymentStatus | string): boolean {
    return this.resolveActionIds(status).includes('accept_form');
  }

  canResubmitCorrections(status: FormPaymentStatus | string): boolean {
    return this.resolveActionIds(status).includes('accept_corrections');
  }

  canCancel(status: FormPaymentStatus | string): boolean {
    return this.resolveActionIds(status).includes('cancel_form');
  }
}
