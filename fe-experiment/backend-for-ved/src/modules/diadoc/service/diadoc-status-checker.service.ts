import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { IDiadocService, DiadocDocumentStatus } from './diadoc.service.interface';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Contract } from '../../contract/service/contract.schema';
import { DiadocWebhookProcessorService } from './diadoc-webhook-processor.service';
import { IFormPaymentDocs } from '../../../lib/interfaces/models/form-payment.interface';

/**
 * VF-2: Сервис для периодической проверки статусов документов в Diadoc
 * Проверяет документы, которые были отправлены в Diadoc, но еще не получили webhook о подписании
 *
 * Оптимизации:
 * - Батчинг запросов для параллельной обработки
 * - Кэширование статусов для избежания повторных запросов
 * - Приоритизация документов по времени отправки
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocStatusCheckerService {
  private readonly logger: Logger = new Logger(DiadocStatusCheckerService.name);
  private readonly enabled: boolean;

  // Настройки батчинга
  private readonly batchSize = 10;
  private readonly maxParallelRequests = 5;
  private readonly documentsPerRun = 100;

  // Кэш статусов (documentId -> { status, checkedAt })
  private readonly statusCache = new Map<string, { status: DiadocDocumentStatus; checkedAt: Date }>();
  private readonly cacheTtl = 2 * 60 * 1000; // 2 минуты

  // Минимальное время ожидания перед проверкой (документы отправленные менее минуты назад не проверяем)
  private readonly minWaitTime = 60 * 1000; // 1 минута

  // Счётчики для статистики
  private successCount = 0;
  private errorCount = 0;
  private cacheHitCount = 0;
  private lastRunTime: Date | null = null;

  constructor(
    private readonly webhookProcessor: DiadocWebhookProcessorService,
    @Optional() private readonly configService?: ConfigService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
    @Inject(FORM_PAYMENT_SERVICE) @Optional() private readonly formPaymentService?: IFormPaymentService,
    @Inject('IContractService') @Optional() private readonly contractService?: IContractService,
    @InjectModel(FormPayment.name) @Optional() private readonly formPaymentModel?: Model<FormPayment>,
    @InjectModel(Contract.name) @Optional() private readonly contractModel?: Model<Contract>,
  ) {
    this.enabled = this.configService?.get('diadoc.enabled') || false;

    if (!this.enabled) {
      this.logger.warn('Diadoc integration is disabled. Status checker will not run.');
    }
  }

  /**
   * Проверяет статусы документов каждые 5 минут
   *
   * ПРИМЕЧАНИЕ: @Cron декоратор NestJS требует значение во время компиляции,
   * поэтому используется process.env напрямую. Это стандартный подход для NestJS.
   * Альтернативой является использование SchedulerRegistry для динамического
   * управления интервалами, но это требует значительной переработки.
   *
   * @see https://docs.nestjs.com/techniques/task-scheduling
   */
  @Cron(process.env.DIADOC_STATUS_CHECK_INTERVAL || '*/5 * * * *')
  async checkDiadocDocumentStatuses(): Promise<void> {
    if (!this.enabled || !this.diadocService) {
      return;
    }

    this.logger.log('Starting periodic Diadoc document status check...');
    this.lastRunTime = new Date();

    const initialSuccessCount = this.successCount;
    const initialErrorCount = this.errorCount;
    const initialCacheHitCount = this.cacheHitCount;

    try {
      // Параллельно проверяем все типы документов
      await Promise.all([
        this.checkFormPaymentPaymentOrders(),
        this.checkFormPaymentReports(),
        this.checkContracts(),
      ]);

      const processedCount = this.successCount - initialSuccessCount;
      const errorCountThisRun = this.errorCount - initialErrorCount;
      const cacheHitsThisRun = this.cacheHitCount - initialCacheHitCount;

      this.logger.log(
        `Periodic Diadoc status check completed. Processed: ${processedCount}, Errors: ${errorCountThisRun}, Cache hits: ${cacheHitsThisRun}`,
      );

      // Очистка устаревших записей из кэша
      this.cleanupCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during periodic Diadoc status check: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * Получение статистики работы сервиса
   */
  getStatistics(): {
    successCount: number;
    errorCount: number;
    cacheHitCount: number;
    cacheSize: number;
    lastRunTime: Date | null;
  } {
    return {
      successCount: this.successCount,
      errorCount: this.errorCount,
      cacheHitCount: this.cacheHitCount,
      cacheSize: this.statusCache.size,
      lastRunTime: this.lastRunTime,
    };
  }

  /**
   * Проверяет статусы поручений на оплату в FormPayment
   */
  private async checkFormPaymentPaymentOrders(): Promise<void> {
    if (!this.formPaymentModel || !this.diadocService || !this.formPaymentService) {
      return;
    }

    try {
      const minWaitDate = new Date(Date.now() - this.minWaitTime);

      // VF-2 FIX: Используем updateDate вместо updatedAt (согласно настройкам timestamps в схеме)
      // Находим все FormPayment с paymentOrderDiadocDocumentId, но без подписанного файла
      const formPayments = await this.formPaymentModel.find({
        'docs.paymentOrderDiadocDocumentId': { $exists: true, $ne: null },
        $or: [
          { 'docs.paymentOrderSigned': { $exists: false } },
          { 'docs.paymentOrderSigned': { $size: 0 } },
        ],
        updateDate: { $lt: minWaitDate },
      })
        .sort({ updateDate: 1 }) // Приоритизируем старые документы
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${formPayments.length} FormPayments with pending payment order Diadoc documents`);

      // Обрабатываем батчами
      await this.processBatches(formPayments, async (formPayment) => {
        const docs = formPayment.docs as IFormPaymentDocs | undefined;
        const documentId = docs?.paymentOrderDiadocDocumentId;
        if (!documentId) return;

        const status = await this.getDocumentStatusWithCache(documentId);

        if (this.isTerminalStatus(status)) {
          const fullFormPayment = await this.formPaymentService!.findOneByPaymentOrderDiadocDocumentId(documentId);
          if (fullFormPayment) {
            await this.webhookProcessor.processFormPaymentPaymentOrderStatusChange(fullFormPayment, documentId, status);
            this.successCount++;
          }
        }
      }, 'FormPayment payment order');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking FormPayment payment orders: ${errorMessage}`);
    }
  }

  /**
   * Проверяет статусы отчётов в FormPayment
   */
  private async checkFormPaymentReports(): Promise<void> {
    if (!this.formPaymentModel || !this.diadocService || !this.formPaymentService) {
      return;
    }

    try {
      const minWaitDate = new Date(Date.now() - this.minWaitTime);

      // VF-2 FIX: Используем updateDate вместо updatedAt (согласно настройкам timestamps в схеме)
      const formPayments = await this.formPaymentModel.find({
        'docs.reportDiadocDocumentId': { $exists: true, $ne: null },
        $or: [{ 'docs.reportSigned': { $exists: false } }, { 'docs.reportSigned': null }],
        updateDate: { $lt: minWaitDate },
      })
        .sort({ updateDate: 1 })
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${formPayments.length} FormPayments with pending report Diadoc documents`);

      await this.processBatches(formPayments, async (formPayment) => {
        const docs = formPayment.docs as IFormPaymentDocs | undefined;
        const documentId = docs?.reportDiadocDocumentId;
        if (!documentId) return;

        const status = await this.getDocumentStatusWithCache(documentId);

        if (this.isTerminalStatus(status)) {
          const fullFormPayment = await this.formPaymentService!.findOneByReportDiadocDocumentId(documentId);
          if (fullFormPayment) {
            await this.webhookProcessor.processFormPaymentReportStatusChange(fullFormPayment, documentId, status);
            this.successCount++;
          }
        }
      }, 'FormPayment report');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking FormPayment reports: ${errorMessage}`);
    }
  }

  /**
   * Проверяет статусы договоров
   */
  private async checkContracts(): Promise<void> {
    if (!this.contractModel || !this.diadocService || !this.contractService) {
      return;
    }

    try {
      const minWaitDate = new Date(Date.now() - this.minWaitTime);

      // VF-2 FIX: Используем updateDate вместо updatedAt (согласно настройкам timestamps в схеме)
      const contracts = await this.contractModel.find({
        diadocDocumentId: { $exists: true, $ne: null },
        diadocSignedAt: { $exists: false },
        updateDate: { $lt: minWaitDate },
      })
        .sort({ updateDate: 1 })
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${contracts.length} Contracts with pending Diadoc documents`);

      await this.processBatches(contracts, async (contract) => {
        const documentId = (contract as any).diadocDocumentId;
        if (!documentId) return;

        const status = await this.getDocumentStatusWithCache(documentId);

        if (this.isTerminalStatus(status)) {
          const fullContract = await this.contractService!.findOneByDiadocDocumentId(documentId);
          if (fullContract) {
            await this.webhookProcessor.processContractStatusChange(fullContract, documentId, status);
            this.successCount++;
          }
        }
      }, 'Contract');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking Contracts: ${errorMessage}`);
    }
  }

  /**
   * Обрабатывает документы батчами с параллельным выполнением
   */
  private async processBatches<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    context: string,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      // Ограничиваем количество параллельных запросов
      const chunks: T[][] = [];
      for (let j = 0; j < batch.length; j += this.maxParallelRequests) {
        chunks.push(batch.slice(j, j + this.maxParallelRequests));
      }

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map(item => processor(item)),
        );

        // Подсчитываем ошибки
        for (const result of results) {
          if (result.status === 'rejected') {
            this.errorCount++;
            this.logger.error(`Error processing ${context}: ${result.reason}`);
          }
        }
      }
    }
  }

  /**
   * Получает статус документа с использованием кэша
   */
  private async getDocumentStatusWithCache(documentId: string): Promise<DiadocDocumentStatus> {
    // Проверяем кэш
    const cached = this.statusCache.get(documentId);
    if (cached && (Date.now() - cached.checkedAt.getTime()) < this.cacheTtl) {
      this.cacheHitCount++;
      return cached.status;
    }

    // Запрашиваем статус с retry логикой
    const status = await this.getDocumentStatusWithRetry(documentId);

    // Сохраняем в кэш
    this.statusCache.set(documentId, {
      status,
      checkedAt: new Date(),
    });

    return status;
  }

  /**
   * Получает статус документа с retry логикой для временных ошибок
   */
  private async getDocumentStatusWithRetry(
    documentId: string,
    maxRetries: number = 3,
  ): Promise<DiadocDocumentStatus> {
    if (!this.diadocService) {
      throw new Error('DiadocService is not available');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const status = await this.diadocService.getDocumentStatus(documentId);
        return status;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        const isRetryable =
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('429') ||
          errorMessage.includes('5');

        if (!isRetryable || attempt === maxRetries) {
          throw lastError;
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(
          `Temporary error checking status for documentId=${documentId}, attempt ${attempt}/${maxRetries}. Retrying in ${delayMs}ms`,
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError || new Error('Failed to get document status after retries');
  }

  /**
   * Проверяет, является ли статус терминальным (требует обработки)
   */
  private isTerminalStatus(status: DiadocDocumentStatus): boolean {
    return [
      DiadocDocumentStatus.SIGNED,
      DiadocDocumentStatus.REJECTED,
      DiadocDocumentStatus.CANCELLED,
      DiadocDocumentStatus.ERROR,
    ].includes(status);
  }

  /**
   * Очищает устаревшие записи из кэша
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.statusCache.entries()) {
      if (now - value.checkedAt.getTime() > this.cacheTtl * 2) {
        this.statusCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * Принудительная очистка кэша
   */
  clearCache(): void {
    this.statusCache.clear();
    this.logger.log('Status cache cleared');
  }

  /**
   * Принудительная проверка статуса конкретного документа
   */
  async forceCheckDocument(documentId: string): Promise<DiadocDocumentStatus> {
    // Удаляем из кэша
    this.statusCache.delete(documentId);

    // Запрашиваем статус
    return this.getDocumentStatusWithCache(documentId);
  }
}
