import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as path from 'path';
import { renderFile } from 'pug';
import { randomUUID } from 'crypto';
import { DealRateFixedEvent } from '../../form-payment/events/deal-rate-fixed.event';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { IFileService } from '../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../file/file.constants';
import { FormPaymentDirection, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { IOrderData, ICreatePdfInput } from '../interfaces/order-data.interface';
import { PaymentOrderGenerationStatus } from '../enums/payment-order-generation-status.enum';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { getSigningOrderFeePaymentText } from '../../../lib/utils/helpers/signing-order-text.helper';

const GENERATION_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Service for handling async payment order generation
 * Listens to deal.rate.fixed events and generates payment order PDFs
 */
@Injectable()
export class PaymentOrderGenerationService implements OnModuleInit {
  private readonly logger = new Logger(PaymentOrderGenerationService.name);

  constructor(
    @InjectModel(FormPayment.name)
    private readonly formPaymentModel: Model<FormPayment>,
    @Inject(FILE_SERVICE)
    private readonly fileService: IFileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.logger.log('PaymentOrderGenerationService initialized');
  }

  /**
   * Event listener for DealRateFixedEvent
   * Handles async payment order generation with retry logic
   */
  @OnEvent('deal.rate.fixed', { async: true })
  async handleDealRateFixed(event: DealRateFixedEvent): Promise<void> {
    const { formPaymentId, accountId, rate } = event;
    let lockOwner: string | null = null;

    this.logger.debug(`Processing payment order generation for formPayment ${formPaymentId}`, { accountId });

    try {
      // Step 1: Load formPayment with populated relations
      const formPayment = await this.formPaymentModel
        .findById(formPaymentId)
        .populate('agent')
        .populate('organization')
        .exec();

      if (!formPayment) {
        this.logger.warn(`FormPayment ${formPaymentId} not found, skipping generation`);
        return;
      }

      // Step 2: Idempotency check
      if (formPayment.docs?.paymentOrderSigned && formPayment.docs.paymentOrderSigned.length > 0) {
        this.logger.debug(`Payment order already exists for formPayment ${formPaymentId}, skipping`);
        return;
      }

      // Step 3: Acquire lock (atomic)
      lockOwner = await this.acquireLock(formPaymentId);
      if (!lockOwner) {
        this.logger.debug(`Payment order generation already in progress for formPayment ${formPaymentId}`);
        return;
      }

      // Step 4: Generate PDF using GenerateDocsService
      this.logger.debug(`Generating payment order PDF for formPayment ${formPaymentId}`, { accountId, rate });

      const orderData = this.buildOrderData(formPayment);
      const { text: htmlString } = await this.renderOrderTemplate(orderData);

      if (!htmlString) {
        throw new Error('Failed to render payment order template');
      }

      const pdfPayload: ICreatePdfInput = { text: htmlString };
      const pdfFile = await this.fileService.createPdf(pdfPayload);

      if (!pdfFile || !pdfFile._id) {
        throw new Error('Generated PDF file has no ID');
      }

      const pdfFileId = pdfFile._id.toString();
      this.logger.debug(`Generated PDF for formPayment ${formPaymentId}, fileId: ${pdfFileId}`);

      // Step 5: Upload to FileService (already done by createPdf)
      this.logger.debug(`Uploaded payment order PDF for formPayment ${formPaymentId}, fileId: ${pdfFile._id}`);

      // Step 6: Update formPayment with generated payment order
      await this.formPaymentModel.updateOne(
        { _id: formPaymentId, 'paymentOrderGeneration.lockOwner': lockOwner },
        {
          $set: {
            'docs.paymentOrderSigned': [pdfFileId],
            'paymentOrderGeneration.status': PaymentOrderGenerationStatus.SUCCESS,
            'paymentOrderGeneration.lastAttemptAt': new Date(),
          },
          $unset: {
            'paymentOrderGeneration.lastError': 1,
            'paymentOrderGeneration.lockOwner': 1,
            'paymentOrderGeneration.lockedAt': 1,
          },
        },
      );

      this.logger.log(`Payment order generated successfully for formPayment ${formPaymentId}, fileId: ${pdfFileId}`);
    } catch (error: unknown) {
      const normalizedError = this.toError(error);
      this.logger.error(`Payment order generation failed for formPayment ${formPaymentId}`, normalizedError.stack);
      if (lockOwner) {
        await this.handleGenerationError(formPaymentId, normalizedError, lockOwner);
      }
    }
  }

  /**
   * Gets currency icon for display
   */
  private getCurrencyIcon(currency: string): string {
    const currencyIcons: Record<string, string> = {
      RUB: '₽',
      CNY: '¥',
      JPY: '¥',
      TRY: '₺',
      USD: '$',
      HKD: 'HK$',
      INR: '₹',
      AED: 'AED',
      EUR: '€',
      CAD: 'C$',
      SGD: 'S$',
      GBP: '£',
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
    };
    return currencyIcons[currency] || currency;
  }

  /**
   * Formats number for template display
   */
  private formatNumber(num: number): string {
    if (!num && num !== 0) return '0';
    return String(num);
  }

  /**
   * Formats date for template display (Russian locale)
   */
  private formatDate(date: Date | string | undefined): string {
    if (!date) return 'n/a';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU');
  }

  private isAgentPopulated(agent: unknown): agent is IAgent {
    return typeof agent === 'object' && agent !== null && 'organizationName' in agent;
  }

  private isContractPopulated(contract: unknown): contract is IContract {
    return typeof contract === 'object' && contract !== null && 'number' in contract;
  }

  /**
   * Builds order data for rendering payment order template
   */
  private buildOrderData(formPayment: FormPayment): IOrderData {
    const agent = this.isAgentPopulated(formPayment.agent) ? formPayment.agent : null;
    const contract = this.isContractPopulated(agent?.contract) ? agent.contract : null;

    const feeAmount = this.formatNumber(formPayment.totals?.feeAmount);
    const isAdvanceOrder =
      typeof formPayment.status === 'string' && formPayment.status.startsWith(FormPaymentStatus.ADVANCE_SIGNING_ORDER);
    const feePaymentText = getSigningOrderFeePaymentText({
      feeAmount,
      platformPaymentCondition: formPayment.platformPaymentCondition,
      isAdvanceOrder,
    });

    const legacyFixedFeeMinor =
      typeof formPayment.totals?.feeFix === 'number' && formPayment.totals.feeFix > 0
        ? formPayment.totals.feeFix
        : null;
    const coverFixedFeeMinor =
      typeof formPayment.totals?.feeFixCover === 'number' && formPayment.totals.feeFixCover > 0
        ? formPayment.totals.feeFixCover
        : null;

    const clientCurrency = formPayment.currency?.client;
    const fixFeeRate = formPayment.currency?.fixFeeRate;

    let fixedFeeMinor: number | null = null;
    let fixedFeeCurrency: string | undefined;
    let fixedFeeRateValue: number | null = null;

    if (legacyFixedFeeMinor !== null) {
      fixedFeeMinor = legacyFixedFeeMinor;
      fixedFeeCurrency = formPayment.currency?.fixFeeCurrency || clientCurrency;

      if (fixedFeeCurrency && clientCurrency && fixedFeeCurrency !== clientCurrency && typeof fixFeeRate === 'number') {
        fixedFeeRateValue = parseFloat(fixFeeRate.toFixed(4));
      }
    } else if (coverFixedFeeMinor !== null) {
      fixedFeeMinor = coverFixedFeeMinor;
      fixedFeeCurrency = clientCurrency;
    }

    return {
      orderNumber: formPayment.uid,
      orderDate: this.formatDate(new Date()),
      clientOrganizationBusinessForm: formPayment.organization?.businessForm,
      clientOrganizationName: formPayment.organization?.name || 'n/a',
      clientSignerName: formPayment.organization?.signerName || 'n/a',
      agentOrganizationName: agent?.organizationName || 'n/a',
      agentContractNumber: contract?.number || 'n/a',
      agentContractDate: this.formatDate(contract?.date),
      counterpartyName: formPayment.counterparty?.name || 'n/a',
      invoiceNumber: formPayment.invoices?.[0]?.invoiceNumber,
      invoiceDate: this.formatDate(formPayment.invoices?.[0]?.invoiceDate),
      counterpartyCurrencyIcon: this.getCurrencyIcon(formPayment.currency?.counterparty),
      amount: this.formatNumber(formPayment.totals?.amount),
      counterpartyCurrency: formPayment.currency?.counterparty || 'n/a',
      bankName: formPayment.counterparty?.bankName || 'n/a',
      swiftCode: formPayment.counterparty?.swiftCode || 'n/a',
      accountNumber: formPayment.counterparty?.accountNumber || 'n/a',
      currencyRate:
        typeof formPayment.currency?.rate === 'number' ? parseFloat(formPayment.currency.rate.toFixed(4)) : null,
      currencyFeeRate: fixedFeeRateValue,
      feePercent: formPayment.totals?.feePercent ? formPayment.totals.feePercent / 100 : null,
      feeFix: fixedFeeMinor !== null ? fixedFeeMinor / 100 : null,
      coverAmount: this.formatNumber(formPayment.totals?.coverAmount),
      clientCurrencyIcon: this.getCurrencyIcon(formPayment.currency?.client),
      clientCurrency: formPayment.currency?.client || 'n/a',
      feeFixCurrency: fixedFeeCurrency,
      feeAmount,
      feePaymentText,
      isImport: formPayment.direction === FormPaymentDirection.IMPORT,
    };
  }

  /**
   * Renders order template using provided data
   */
  private async renderOrderTemplate(orderData: IOrderData): Promise<{ text: string }> {
    try {
      const templatePath = path.join(__dirname, '../../form-payment/templates/', 'order.pug');

      const htmlString = renderFile(templatePath, orderData);
      return { text: htmlString };
    } catch (error: unknown) {
      const normalizedError = this.toError(error);
      this.logger.error('Failed to render order template', {
        error: normalizedError.message,
        stack: normalizedError.stack,
      });
      throw new Error(`Failed to render order template: ${normalizedError.message}`);
    }
  }

  /**
   * Acquires distributed lock using atomic MongoDB update
   * Prevents concurrent generation of same payment order
   */
  private async acquireLock(formPaymentId: string): Promise<string | null> {
    try {
      const lockOwner = randomUUID();
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - GENERATION_RETRY_DELAY_MS);

      const result = await this.formPaymentModel.updateOne(
        {
          _id: formPaymentId,
          'paymentOrderGeneration.status': { $ne: PaymentOrderGenerationStatus.SUCCESS },
          $or: [
            // Not locked yet
            { 'paymentOrderGeneration.lockOwner': { $exists: false } },
            { 'paymentOrderGeneration.lockOwner': null },
            // Lock is stale and can be reclaimed
            { 'paymentOrderGeneration.lockedAt': { $lt: staleThreshold } },
          ],
        },
        {
          $set: {
            'paymentOrderGeneration.status': PaymentOrderGenerationStatus.PENDING,
            'paymentOrderGeneration.lockOwner': lockOwner,
            'paymentOrderGeneration.lockedAt': now,
            'paymentOrderGeneration.lastAttemptAt': now,
          },
          $inc: { 'paymentOrderGeneration.attempts': 1 },
        },
      );

      return result.matchedCount > 0 ? lockOwner : null;
    } catch (error: unknown) {
      const normalizedError = this.toError(error);
      this.logger.error(`Failed to acquire lock for formPayment ${formPaymentId}`, normalizedError.message);
      return null;
    }
  }

  /**
   * Handles generation errors with retry strategy
   */
  private async handleGenerationError(formPaymentId: string, error: Error, lockOwner?: string): Promise<void> {
    try {
      const formPayment = await this.formPaymentModel.findById(formPaymentId);

      if (!formPayment) {
        this.logger.warn(`FormPayment ${formPaymentId} not found, cannot record error`);
        return;
      }

      const attempts = formPayment.paymentOrderGeneration?.attempts || 0;
      const isTransient = this.isTransientError(error);

      if (attempts >= MAX_GENERATION_ATTEMPTS || !isTransient) {
        // Max retries or permanent error
        await this.markAsFailed(formPaymentId, error.message, lockOwner);
      } else {
        // Keep pending for retry
        await this.markAsPending(formPaymentId, error.message, lockOwner);
      }
    } catch (err: unknown) {
      const normalizedError = this.toError(err);
      this.logger.error(`Failed to handle generation error for ${formPaymentId}`, normalizedError.message);
    }
  }

  /**
   * Marks generation as failed (no more retries)
   */
  private async markAsFailed(formPaymentId: string, errorMessage: string, lockOwner?: string): Promise<void> {
    const filter: Record<string, unknown> = { _id: formPaymentId };
    if (lockOwner) {
      filter['paymentOrderGeneration.lockOwner'] = lockOwner;
    }

    await this.formPaymentModel.updateOne(filter, {
      $set: {
        'paymentOrderGeneration.status': PaymentOrderGenerationStatus.FAILED,
        'paymentOrderGeneration.lastError': errorMessage.substring(0, 500),
        'paymentOrderGeneration.lastAttemptAt': new Date(),
      },
      $unset: {
        'paymentOrderGeneration.lockOwner': 1,
        'paymentOrderGeneration.lockedAt': 1,
      },
    });

    this.logger.error(`Payment order generation marked as failed for formPayment ${formPaymentId}`, {
      error: errorMessage.substring(0, 200),
    });
  }

  /**
   * Marks generation as pending (will be retried)
   */
  private async markAsPending(formPaymentId: string, errorMessage: string, lockOwner?: string): Promise<void> {
    const filter: Record<string, unknown> = { _id: formPaymentId };
    if (lockOwner) {
      filter['paymentOrderGeneration.lockOwner'] = lockOwner;
    }

    await this.formPaymentModel.updateOne(filter, {
      $set: {
        'paymentOrderGeneration.status': PaymentOrderGenerationStatus.PENDING,
        'paymentOrderGeneration.lastError': errorMessage.substring(0, 500),
        'paymentOrderGeneration.lastAttemptAt': new Date(),
      },
      $unset: {
        'paymentOrderGeneration.lockOwner': 1,
        'paymentOrderGeneration.lockedAt': 1,
      },
    });

    this.logger.warn(`Payment order generation marked as pending for retry (formPayment ${formPaymentId})`, {
      error: errorMessage.substring(0, 200),
    });
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error('Unknown error');
    }
  }

  /**
   * Classifies errors as transient (retry) or permanent (no retry)
   */
  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      /network/i,
      /timeout/i,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ENOTFOUND/,
      /503/,
      /504/,
      /EAGAIN/,
    ];

    return transientPatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Scheduled job to retry failed generations
   * Runs every 5 minutes to find and retry pending generations
   */
  @Cron('*/5 * * * *')
  async retryFailedGenerations(): Promise<void> {
    this.logger.debug('Running payment order generation retry job');

    try {
      const fiveMinutesAgo = new Date(Date.now() - GENERATION_RETRY_DELAY_MS);

      // Find pending generations that haven't been attempted recently
      const pendingGenerations = await this.formPaymentModel.find({
        'paymentOrderGeneration.status': PaymentOrderGenerationStatus.PENDING,
        'paymentOrderGeneration.attempts': { $lt: MAX_GENERATION_ATTEMPTS },
        'paymentOrderGeneration.lastAttemptAt': { $lt: fiveMinutesAgo },
        $or: [
          { 'paymentOrderGeneration.lockOwner': { $exists: false } },
          { 'paymentOrderGeneration.lockOwner': null },
          { 'paymentOrderGeneration.lockedAt': { $lt: fiveMinutesAgo } },
        ],
      });

      if (pendingGenerations.length === 0) {
        this.logger.debug('No pending payment order generations to retry');
        return;
      }

      this.logger.debug(`Found ${pendingGenerations.length} pending generations to retry`);

      // Re-emit events for retry
      for (const formPayment of pendingGenerations) {
        const event: DealRateFixedEvent = {
          formPaymentId: formPayment._id.toString(),
          accountId: formPayment.account.toString(),
          rate: formPayment.currency?.rate || 0,
          fixedAt: formPayment.paymentOrderGeneration?.lastAttemptAt || new Date(),
        };

        this.logger.debug(`Re-emitting deal.rate.fixed event for formPayment ${formPayment._id}`, {
          attempts: formPayment.paymentOrderGeneration?.attempts,
        });

        // Emit event to retry
        this.eventEmitter.emit('deal.rate.fixed', event);

        // Using a small delay to avoid overwhelming the system
        await this.delayMs(100);
      }
    } catch (error: unknown) {
      const normalizedError = this.toError(error);
      this.logger.error('Payment order generation retry job failed', normalizedError.message);
    }
  }

  private delayMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
