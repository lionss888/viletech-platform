import { Injectable, Logger } from '@nestjs/common';
import { HsCodeLoyalty } from 'lib/enums/models/hs-code.enums';
import { IHsCodeSnapshot } from 'lib/interfaces/models/hs-code.interface';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';

export interface AutoProcessingResult {
  shouldAutoReject: boolean;
  shouldForceVerification: boolean;
  shouldAllowSkipCompliance: boolean;
  reason: string;
  statusToSet: FormPaymentStatus;
}

@Injectable()
export class AutoProcessingService {
  private readonly logger = new Logger(AutoProcessingService.name);

  processHsCodeSnapshots(
    snapshots: IHsCodeSnapshot[],
    hasGoodsInvoices: boolean,
    clientOrganizationApproved: boolean, // Client organization approved by internal compliance
  ): AutoProcessingResult {
    if (!snapshots || snapshots.length === 0) {
      // Services-only applications have no snapshots - this is normal
      if (!hasGoodsInvoices) {
        const reason = 'Services-only application, no HS code risk check required';
        this.logger.debug(reason);
        return {
          shouldAutoReject: false,
          shouldForceVerification: false,
          shouldAllowSkipCompliance: clientOrganizationApproved,
          reason,
          statusToSet: clientOrganizationApproved
            ? FormPaymentStatus.FORM_ACCEPTED
            : FormPaymentStatus.FORM_WAITING_VERIFICATION,
        };
      }

      // Goods exist but no snapshots - this is an error that should have been caught earlier
      const reason = 'Goods invoices must have HS codes';
      this.logger.error(reason);
      return {
        shouldAutoReject: true,
        shouldForceVerification: false,
        shouldAllowSkipCompliance: false,
        reason,
        statusToSet: FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
      };
    }

    // Check for REJECT statuses (critical risk - requires manual verification)
    const rejectCode = snapshots.find((s) => s.loyalty === HsCodeLoyalty.REJECT);
    if (rejectCode) {
      const reason = `HS code "${rejectCode.code}" has REJECT status (critical risk)`;
      this.logger.warn(`Form has critical HS code risk: ${reason}`);
      return {
        shouldAutoReject: false,
        shouldForceVerification: true,
        shouldAllowSkipCompliance: false,
        reason,
        statusToSet: FormPaymentStatus.FORM_WAITING_VERIFICATION,
      };
    }

    // Check for NOT_OK, NOT_QUITE_OK or manual codes (all require verification)
    const hasManualCode = snapshots.some((s) => s.isManual || !s.loyalty);
    const hasNotOkCode = snapshots.some((s) => s.loyalty === HsCodeLoyalty.NOT_OK);
    const hasNotQuiteOkCode = snapshots.some((s) => s.loyalty === HsCodeLoyalty.NOT_QUITE_OK);

    if (hasManualCode || hasNotOkCode || hasNotQuiteOkCode) {
      const reasons = [];
      if (hasManualCode) reasons.push('manual HS codes');
      if (hasNotOkCode) reasons.push('NOT_OK HS codes');
      if (hasNotQuiteOkCode) reasons.push('NOT_QUITE_OK HS codes');

      const reason = `Form has ${reasons.join(', ')} requiring verification`;
      this.logger.debug(`Forcing verification for form: ${reason}`);
      return {
        shouldAutoReject: false,
        shouldForceVerification: true,
        shouldAllowSkipCompliance: false,
        reason,
        statusToSet: FormPaymentStatus.FORM_WAITING_VERIFICATION,
      };
    }

    // All codes are OK - check if can skip INTERNAL compliance
    if (clientOrganizationApproved) {
      const reason = 'All HS codes OK and client organization approved - skip internal compliance';
      this.logger.debug(`Allowing skip internal compliance: ${reason}`);
      return {
        shouldAutoReject: false,
        shouldForceVerification: false,
        shouldAllowSkipCompliance: true,
        reason,
        statusToSet: FormPaymentStatus.FORM_ACCEPTED, // Note: May be changed by external compliance check
      };
    }

    // All codes OK but client organization not approved
    const reason = 'All HS codes OK but client organization not approved - requires internal compliance';
    this.logger.debug(`Normal processing required: ${reason}`);
    return {
      shouldAutoReject: false,
      shouldForceVerification: false,
      shouldAllowSkipCompliance: false,
      reason,
      statusToSet: FormPaymentStatus.FORM_WAITING_VERIFICATION,
    };
  }
}
