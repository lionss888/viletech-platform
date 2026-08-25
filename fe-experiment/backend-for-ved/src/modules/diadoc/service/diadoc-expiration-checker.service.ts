import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPaymentService, IFormUpdate } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Contract } from '../../contract/service/contract.schema';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { SenderFormPaymentEvents, SenderPattern } from '../../../lib/enums/models/sender.enums';
import { IFormPayment, IFormPaymentDocs } from '../../../lib/interfaces/models/form-payment.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { IContractDiadocUpdate } from '../types/diadoc-api.types';

/**
 * VF-2 FIX: Сервис для проверки истечения срока подписания документов в Diadoc
 *
 * Проверяет документы, отправленные в Diadoc более 3 дней назад, но еще не подписанные.
 * При обнаружении таких документов:
 * - Автоматически переводит статус в "Требуются уточнения"
 * - Отправляет уведомление клиенту
 *
 * ## Функционал
 *
 * - Периодическая проверка FormPayment (поручения и отчёты)
 * - Периодическая проверка Contract
 * - Автоматическая смена статуса при истечении 3 дней
 * - Отправка уведомлений
 *
 * @example
 * ```typescript
 * // Cron job запускается каждый час
 * // Проверяет документы с isDiadocSigning=true и diadocSentAt < now - 3 days
 * ```
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocExpirationCheckerService {
  private readonly logger: Logger = new Logger(DiadocExpirationCheckerService.name);
  private readonly enabled: boolean;

  // Настройки
  private readonly expirationDays = 3;
  private readonly documentsPerRun = 100;

  // Статистика
  private lastRunTime: Date | null = null;
  private expiredPaymentOrdersCount = 0;
  private expiredReportsCount = 0;
  private expiredContractsCount = 0;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Inject(FORM_PAYMENT_SERVICE) @Optional() private readonly formPaymentService?: IFormPaymentService,
    @Inject('IContractService') @Optional() private readonly contractService?: IContractService,
    @InjectModel(FormPayment.name) @Optional() private readonly formPaymentModel?: Model<FormPayment>,
    @InjectModel(Contract.name) @Optional() private readonly contractModel?: Model<Contract>,
    @InjectNats() @Optional() private readonly natsClient?: NatsClientProxy,
  ) {
    this.enabled = this.configService?.get('diadoc.enabled') || false;

    if (!this.enabled) {
      this.logger.warn('Diadoc integration is disabled. Expiration checker will not run.');
    }
  }

  /**
   * Проверяет документы на истечение срока подписания каждый час
   */
  @Cron('0 * * * *') // Каждый час в 0 минут
  async checkExpiredDocuments(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting Diadoc document expiration check...');
    this.lastRunTime = new Date();

    const initialPaymentOrders = this.expiredPaymentOrdersCount;
    const initialReports = this.expiredReportsCount;
    const initialContracts = this.expiredContractsCount;

    try {
      // Параллельно проверяем все типы документов
      await Promise.all([
        this.checkExpiredPaymentOrders(),
        this.checkExpiredReports(),
        this.checkExpiredContracts(),
      ]);

      const processedPaymentOrders = this.expiredPaymentOrdersCount - initialPaymentOrders;
      const processedReports = this.expiredReportsCount - initialReports;
      const processedContracts = this.expiredContractsCount - initialContracts;

      this.logger.log(
        `Diadoc expiration check completed. Expired: paymentOrders=${processedPaymentOrders}, reports=${processedReports}, contracts=${processedContracts}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during Diadoc expiration check: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * Получение статистики работы сервиса
   */
  getStatistics(): {
    expiredPaymentOrdersCount: number;
    expiredReportsCount: number;
    expiredContractsCount: number;
    lastRunTime: Date | null;
  } {
    return {
      expiredPaymentOrdersCount: this.expiredPaymentOrdersCount,
      expiredReportsCount: this.expiredReportsCount,
      expiredContractsCount: this.expiredContractsCount,
      lastRunTime: this.lastRunTime,
    };
  }

  /**
   * Проверяет истекшие поручения на оплату
   */
  private async checkExpiredPaymentOrders(): Promise<void> {
    if (!this.formPaymentModel || !this.formPaymentService) {
      return;
    }

    try {
      const expirationDate = this.getExpirationDate();

      // Находим документы с истекшим сроком подписания
      const expiredFormPayments = await this.formPaymentModel.find({
        'docs.paymentOrderIsDiadocSigning': true,
        'docs.paymentOrderDiadocSentAt': { $lt: expirationDate },
        status: { $nin: [
          FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
          FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
          FormPaymentStatus.COMPLETED,
        ] },
      })
        .sort({ 'docs.paymentOrderDiadocSentAt': 1 })
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${expiredFormPayments.length} FormPayments with expired payment order signing`);

      for (const formPayment of expiredFormPayments) {
        try {
          await this.handleExpiredPaymentOrder(formPayment);
          this.expiredPaymentOrdersCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error handling expired payment order for formPayment ${formPayment._id}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking expired payment orders: ${errorMessage}`);
    }
  }

  /**
   * Проверяет истекшие отчёты
   */
  private async checkExpiredReports(): Promise<void> {
    if (!this.formPaymentModel || !this.formPaymentService) {
      return;
    }

    try {
      const expirationDate = this.getExpirationDate();

      // VF-2: Включаем REPORT_WAITING_DIADOC в проверку на истечение срока
      const expiredFormPayments = await this.formPaymentModel.find({
        'docs.reportIsDiadocSigning': true,
        'docs.reportDiadocSentAt': { $lt: expirationDate },
        status: { $nin: [
          FormPaymentStatus.REPORT_WAITING_VERIFICATION,
          FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
          FormPaymentStatus.REPORT_ACCEPTED,
          FormPaymentStatus.COMPLETED,
        ] },
      })
        .sort({ 'docs.reportDiadocSentAt': 1 })
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${expiredFormPayments.length} FormPayments with expired report signing`);

      for (const formPayment of expiredFormPayments) {
        try {
          await this.handleExpiredReport(formPayment);
          this.expiredReportsCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error handling expired report for formPayment ${formPayment._id}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking expired reports: ${errorMessage}`);
    }
  }

  /**
   * Проверяет истекшие договоры
   */
  private async checkExpiredContracts(): Promise<void> {
    if (!this.contractModel || !this.contractService) {
      return;
    }

    try {
      const expirationDate = this.getExpirationDate();

      // VF-2: Проверяем договоры в статусе WAITING_DIADOC на истечение срока
      const expiredContracts = await this.contractModel.find({
        isDiadocSigning: true,
        diadocSentAt: { $lt: expirationDate },
        // Включаем только WAITING_DIADOC (и CREATED для обратной совместимости)
        status: { $in: [
          ContractStatus.WAITING_DIADOC,
          ContractStatus.CREATED,
        ] },
      })
        .sort({ diadocSentAt: 1 })
        .limit(this.documentsPerRun);

      this.logger.log(`Found ${expiredContracts.length} Contracts with expired signing`);

      for (const contract of expiredContracts) {
        try {
          await this.handleExpiredContract(contract);
          this.expiredContractsCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error handling expired contract ${contract._id}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking expired contracts: ${errorMessage}`);
    }
  }

  /**
   * VF-2 FIX: Обрабатывает истекшее поручение на оплату
   * Использует типизированный интерфейс IFormPayment вместо any
   */
  private async handleExpiredPaymentOrder(formPayment: IFormPayment): Promise<void> {
    this.logger.log(`Handling expired payment order for formPayment ${formPayment._id}`);

    // VF-2 FIX: Обновляем статус на "Требуются уточнения" с типизированным обновлением
    const updateData: IFormUpdate = {
      status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
      prevStatus: formPayment.status,
      docs: {
        ...(formPayment.docs || {}),
        paymentOrderIsDiadocSigning: false,
      },
      rejectText: 'Контрагент не подписал поручение в течение 3 дней. Заявка требует уточнений.',
    };
    await this.formPaymentService!.updateOne({ _id: formPayment._id }, updateData);

    this.logger.log(`Payment order expired: formPaymentId=${formPayment._id} - status changed to SIGNING_ORDER_WAITING_CORRECTIONS`);

    // VF-2: Отправка уведомления клиенту через NATS
    await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED);
  }

  /**
   * VF-2 FIX: Обрабатывает истекший отчёт
   * При истечении из REPORT_WAITING_DIADOC переводит в REPORT_WAITING_CORRECTIONS
   * Использует типизированный интерфейс IFormPayment вместо any
   */
  private async handleExpiredReport(formPayment: IFormPayment): Promise<void> {
    this.logger.log(`Handling expired report for formPayment ${formPayment._id}, currentStatus=${formPayment.status}`);

    // VF-2: Определяем новый статус в зависимости от текущего
    const newStatus = formPayment.status === FormPaymentStatus.REPORT_WAITING_DIADOC
      ? FormPaymentStatus.REPORT_WAITING_CORRECTIONS
      : formPayment.status; // Для других статусов оставляем текущий

    // VF-2 FIX: Обновляем заявку с типизированным обновлением
    const updateData: IFormUpdate = {
      status: newStatus,
      prevStatus: formPayment.status,
      docs: {
        ...(formPayment.docs || {}),
        reportIsDiadocSigning: false,
      },
      rejectText: formPayment.status === FormPaymentStatus.REPORT_WAITING_DIADOC
        ? 'Контрагент не подписал отчёт в течение 3 дней. Отчёт требует уточнений.'
        : undefined,
    };
    await this.formPaymentService!.updateOne({ _id: formPayment._id }, updateData);

    this.logger.log(`Report signing expired: formPaymentId=${formPayment._id} - status changed to ${newStatus}`);

    // VF-2: Отправка уведомления клиенту через NATS
    await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED);
  }

  /**
   * VF-2 FIX: Обрабатывает истекший договор
   * Использует типизированный интерфейс IContract вместо any
   */
  private async handleExpiredContract(contract: IContract): Promise<void> {
    this.logger.log(`Handling expired contract ${contract._id}`);

    // VF-2 FIX: Обновляем статус на "Отклонён" с типизированным обновлением
    const updateData: IContractDiadocUpdate = {
      status: ContractStatus.REJECTED,
      isDiadocSigning: false,
      rejectText: 'Контрагент не подписал договор в течение 3 дней.',
    };
    await this.contractService!.updateOne({ _id: contract._id }, updateData as any);

    this.logger.log(`Contract signing expired: contractId=${contract._id} - status changed to REJECTED`);

    // VF-2: Отправка уведомления клиенту через NATS
    await this.sendContractNotificationToUser(contract, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED);
  }

  /**
   * Вычисляет дату истечения срока (3 дня назад)
   */
  private getExpirationDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - this.expirationDays);
    return date;
  }

  /**
   * Принудительная проверка всех документов (для отладки)
   */
  async forceCheck(): Promise<{
    expiredPaymentOrders: number;
    expiredReports: number;
    expiredContracts: number;
  }> {
    const initialPaymentOrders = this.expiredPaymentOrdersCount;
    const initialReports = this.expiredReportsCount;
    const initialContracts = this.expiredContractsCount;

    await this.checkExpiredDocuments();

    return {
      expiredPaymentOrders: this.expiredPaymentOrdersCount - initialPaymentOrders,
      expiredReports: this.expiredReportsCount - initialReports,
      expiredContracts: this.expiredContractsCount - initialContracts,
    };
  }

  /**
   * VF-2 FIX: Отправляет уведомление клиенту о событии FormPayment через NATS
   * Использует типизированный интерфейс IFormPayment вместо any
   */
  private async sendNotificationToUser(formPayment: IFormPayment, event: SenderFormPaymentEvents): Promise<void> {
    if (!this.natsClient) {
      this.logger.warn('NatsClient not available, skipping notification');
      return;
    }

    try {
      const accountId = typeof formPayment.account === 'string'
        ? formPayment.account
        : formPayment.account?._id?.toString();

      if (!accountId) {
        this.logger.warn(`Cannot send notification: account not found for formPayment ${formPayment._id}`);
        return;
      }

      await this.natsClient.send(SenderPattern.SEND_USER, {
        type: event,
        account: accountId,
        data: { ...formPayment },
        language: 'ru',
      });

      this.logger.log(`Notification sent to user: formPaymentId=${formPayment._id}, event=${event}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending notification for formPayment ${formPayment._id}: ${errorMessage}`);
    }
  }

  /**
   * VF-2 FIX: Отправляет уведомление клиенту о событии Contract через NATS
   * Использует типизированный интерфейс IContract вместо any
   */
  private async sendContractNotificationToUser(contract: IContract, event: SenderFormPaymentEvents): Promise<void> {
    if (!this.natsClient) {
      this.logger.warn('NatsClient not available, skipping notification');
      return;
    }

    try {
      const accountId = typeof contract.account === 'string'
        ? contract.account
        : contract.account?._id?.toString();

      if (!accountId) {
        this.logger.warn(`Cannot send notification: account not found for contract ${contract._id}`);
        return;
      }

      await this.natsClient.send(SenderPattern.SEND_USER, {
        type: event,
        account: accountId,
        data: { ...contract },
        language: 'ru',
      });

      this.logger.log(`Notification sent to user: contractId=${contract._id}, event=${event}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending notification for contract ${contract._id}: ${errorMessage}`);
    }
  }
}
