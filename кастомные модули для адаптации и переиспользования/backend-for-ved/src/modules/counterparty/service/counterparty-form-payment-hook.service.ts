import { Injectable, Logger } from '@nestjs/common';
import { CounterpartyService } from './counterparty.service';
import { CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';

@Injectable()
export class CounterpartyFormPaymentHookService {
  private readonly logger: Logger = new Logger(CounterpartyFormPaymentHookService.name);

  constructor(private readonly counterpartyService: CounterpartyService) {}

  /**
   * Call this when a FormPayment is created to link it to a counterparty
   */
  async onFormPaymentCreated(formPaymentId: string, counterpartyId?: string): Promise<void> {
    if (!counterpartyId) {
      return;
    }

    try {
      await this.counterpartyService.addFormPayment(counterpartyId, formPaymentId);
      this.logger.debug(`FormPayment linked to counterparty: ${counterpartyId}, formPaymentId: ${formPaymentId}`);
    } catch (error) {
      this.logger.error(`Failed to link FormPayment to counterparty: ${error.message}`, error.stack);
    }
  }

  /**
   * Call this when a FormPayment is deleted to unlink it from counterparty
   */
  async onFormPaymentDeleted(formPaymentId: string, counterpartyId?: string): Promise<void> {
    if (!counterpartyId) {
      return;
    }

    try {
      await this.counterpartyService.removeFormPayment(counterpartyId, formPaymentId);
      this.logger.debug(`FormPayment unlinked from counterparty: ${counterpartyId}, formPaymentId: ${formPaymentId}`);
    } catch (error) {
      this.logger.error(`Failed to unlink FormPayment from counterparty: ${error.message}`, error.stack);
    }
  }

  /**
   * Call this when a FormPayment status changes to update counterparty approval
   * Should be called when FormPayment transitions to FORM_ACCEPTED (approved) or rejection statuses
   */
  async onFormPaymentStatusChanged(
    formPaymentId: string,
    newStatus: FormPaymentStatus,
    counterpartyId?: string,
    complianceOfficerId?: string,
    comment?: string,
  ): Promise<void> {
    if (!counterpartyId) {
      return;
    }

    let approvalStatus: CounterpartyApprovalStatus | null = null;

    if (newStatus === FormPaymentStatus.FORM_ACCEPTED) {
      approvalStatus = CounterpartyApprovalStatus.APPROVED;
    } else if (
      newStatus === FormPaymentStatus.FORM_WAITING_CORRECTIONS ||
      newStatus === FormPaymentStatus.FORM_VERIFICATION
    ) {
      approvalStatus = CounterpartyApprovalStatus.REJECTED;
    }

    if (!approvalStatus) {
      return;
    }

    try {
      await this.counterpartyService.updateApprovalStatus(counterpartyId, {
        lastApprovalStatus: approvalStatus,
        lastApprovalDate: new Date(),
        lastApprovedBy: complianceOfficerId,
        lastApprovalComment: comment,
      });

      this.logger.log(
        `Counterparty approval status updated: ${counterpartyId}, status: ${approvalStatus}, formPaymentId: ${formPaymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update counterparty approval status: ${error.message}, counterpartyId: ${counterpartyId}`,
        error.stack,
      );
    }
  }

  /**
   * Get approval history indicator for a counterparty to display in FormPayment review UI
   */
  async getApprovalHistoryForDisplay(counterpartyId: string): Promise<{
    requiresReview: boolean;
    monthsSinceApproval: number | null;
    indicator: string;
  }> {
    try {
      const { requiresReview, monthsSinceApproval } = await this.counterpartyService.getApprovalHistoryIndicator(
        counterpartyId,
      );

      let indicator = 'Unknown';
      if (monthsSinceApproval === null) {
        indicator = 'Not approved yet';
      } else if (monthsSinceApproval < 6) {
        indicator = `Approved ${monthsSinceApproval} months ago - No re-review needed`;
      } else {
        indicator = `Approved ${monthsSinceApproval} months ago - Re-review required`;
      }

      return { requiresReview, monthsSinceApproval, indicator };
    } catch (error) {
      this.logger.error(`Failed to get approval history: ${error.message}, counterpartyId: ${counterpartyId}`);
      return { requiresReview: true, monthsSinceApproval: null, indicator: 'Error fetching history' };
    }
  }

  /**
   * Check if external compliance can be skipped after internal compliance approval
   *
   * Business logic:
   * - Called after internal compliance officer approves organization (ORGANIZATION_VERIFICATION stage)
   * - If counterparty was approved < 6 months ago → skip FORM_VERIFICATION stage
   * - FormPayment goes directly from ORGANIZATION_VERIFICATION to next stage (AGENCY_CONTRACT)
   *
   * Usage:
   *   const canSkip = await hookService.checkAutoSkipExternalCompliance(formPayment.counterpartyRef);
   *   if (canSkip) {
   *     // Skip FORM_VERIFICATION stage, go to next stage
   *   }
   */
  async checkAutoSkipExternalCompliance(counterpartyId?: string): Promise<boolean> {
    if (!counterpartyId) {
      this.logger.debug('No counterpartyRef - cannot skip external compliance');
      return false;
    }

    try {
      const canSkip = await this.counterpartyService.canSkipExternalCompliance(counterpartyId);

      if (canSkip) {
        this.logger.log(
          `Auto-skip external compliance enabled for counterparty: ${counterpartyId} ` + `(approved < 6 months ago)`,
        );
      }

      return canSkip;
    } catch (error) {
      this.logger.error(
        `Failed to check auto-skip external compliance: ${error.message}, counterpartyId: ${counterpartyId}`,
        error.stack,
      );
      return false;
    }
  }
}
