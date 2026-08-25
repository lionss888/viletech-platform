import { Injectable } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
} from '../bdui.constants';

/**
 * Resolves which BDUI action ids a User may invoke for a given form status.
 */
@Injectable()
export class BduiUserActionResolver {
  /**
   * Returns action ids available to the User role for the given form status.
   */
  resolveActionIds(status: FormPaymentStatus | string | undefined): string[] {
    if (!status) {
      return [];
    }
    const actionIds: string[] = [];
    if (this.canSubmit(status)) {
      actionIds.push(BDUI_ACTION_ACCEPT_FORM);
    }
    if (this.canResubmitCorrections(status)) {
      actionIds.push(BDUI_ACTION_ACCEPT_CORRECTIONS);
    }
    if (this.canCancel(status)) {
      actionIds.push(BDUI_ACTION_CANCEL_FORM);
    }
    return actionIds;
  }

  /**
   * Draft / creating — user may send the form for verification.
   */
  canSubmit(status: FormPaymentStatus | string): boolean {
    return status === FormPaymentStatus.DRAFT || status === FormPaymentStatus.CREATING;
  }

  /**
   * Returned for corrections — user may resubmit.
   */
  canResubmitCorrections(status: FormPaymentStatus | string): boolean {
    return status === FormPaymentStatus.FORM_WAITING_CORRECTIONS;
  }

  /**
   * User may cancel while the form is still editable or awaiting first review.
   */
  canCancel(status: FormPaymentStatus | string): boolean {
    return (
      status === FormPaymentStatus.DRAFT ||
      status === FormPaymentStatus.CREATING ||
      status === FormPaymentStatus.FORM_WAITING_CORRECTIONS ||
      status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION ||
      status === FormPaymentStatus.FORM_WAITING_VERIFICATION
    );
  }
}
