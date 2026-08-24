import { BaseService } from '../../../lib/services/base/base.service';
import { ITreasurerTask } from '../../../lib/interfaces/models/treasurer-task.interface';
import { TreasurerTask } from './treasurer-task.schema';
import { IBaseOptions } from '../../../lib/services/base/base.service.interface';
import {
  ITreasurerTaskCreate,
  ITreasurerTaskQuery,
  ITreasurerTaskService,
  ITreasurerTaskUpdate,
} from './treasurer-task.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Model } from 'mongoose';
import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common';
import { TreasurerTaskStatus } from '../../../lib/enums/models/treasurer-task.enums';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Types } from 'mongoose';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { IFileService } from '../../file/service/file.service.interface';
import { FILE_SERVICE, FILE_CLIENT } from '../../file/file.constants';
import { NatsClientProxy, GetNatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { AGENT_CLIENT } from '../../agent/agent.constants';
import { CONTRACT_CLIENT } from '../../contract/contract.constants';
import { FORM_PAYMENT_CLIENT } from '../../form-payment/form-payment.constants';
import { AgentPattern } from '../../../lib/enums/models/agent.enums';
import { ContractPattern, ContractStatus } from '../../../lib/enums/models/contract.enums';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { ITreasurerOrderData, ICreatePdfInput } from '../interfaces/treasurer-order-data.interface';
import { FilePattern } from '../../../lib/enums/models/file.enums';
import { FormPaymentPattern } from '../../../lib/enums/models/form-payment.enums';
import { IS3Service } from '../../../lib/modules/s3/s3.service.interface';
import { SocketMessageAction } from '../../../lib/enums/models/socket.enum';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { IFormPaymentQueueData } from '../../form-payment/queue/form-payment-queue.processor.interface';
import * as path from 'path';
import { renderFile } from 'pug';
import { TreasurerTaskUpdateCommissionDto } from '../dto/treasurer-task.update-commission.dto';

@Injectable()
export class TreasurerTaskService
  extends BaseService<
    ITreasurerTask,
    TreasurerTask,
    ITreasurerTaskQuery,
    IBaseOptions,
    ITreasurerTaskCreate,
    ITreasurerTaskUpdate
  >
  implements ITreasurerTaskService
{
  private readonly logger = new Logger(TreasurerTaskService.name);

  constructor(
    @InjectModel(TreasurerTask.name) readonly model: PaginateModel<TreasurerTask>,
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
    @Inject(GetNatsClientProxy(FILE_CLIENT).name) private readonly fileNatsClient: NatsClientProxy,
    @Inject(GetNatsClientProxy(AGENT_CLIENT).name) private readonly agentNatsClient: NatsClientProxy,
    @Inject(GetNatsClientProxy(CONTRACT_CLIENT).name) private readonly contractNatsClient: NatsClientProxy,
    @Inject(GetNatsClientProxy(FORM_PAYMENT_CLIENT).name) private readonly formPaymentNatsClient: NatsClientProxy,
    @InjectQueue(JobQueueName.FORM_PAYMENT_QUEUE) private readonly formPaymentQueue: Queue<IFormPaymentQueueData>,
  ) {
    super();
  }

  async makeQuery({
    _ids,
    type,
    status,
    clientId,
    exportPaymentId,
    importPaymentId,
    ...findData
  }: ITreasurerTaskQuery) {
    const query: FilterQuery<TreasurerTask> = {
      ...findData,
      ...(_ids?.length && { _id: { $in: _ids } }),
      ...(type && { type }),
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(exportPaymentId && { exportPaymentId }),
      ...(importPaymentId && { importPaymentId }),
    };

    return query;
  }

  async create(createData: ITreasurerTaskCreate, options?: IBaseOptions): Promise<ITreasurerTask> {
    // Предзаполняем поля дополнительной комиссии:
    // additionalCommissionCurrency берется из refundCurrency, если он указан
    // additionalCommissionExchangeRate берется из exchangeRate, если он указан
    const cleanCreateData: ITreasurerTaskCreate = {
      ...createData,
      additionalCommissionCurrency: createData.refundCurrency || '',
      additionalCommissionAmount: 0,
      additionalCommissionExchangeRate: createData.exchangeRate || 0,
      additionalCommissionAmountInRubles: 0,
    };

    const createdTask = await super.create(cleanCreateData, options);

    // Пересчитываем refundAmountInRublesAfterCommission, если есть обычная комиссия
    if (createdTask.refundAmountInRubles && createdTask.commissionAmountInRubles) {
      const refundAmountInRublesAfterCommission = Math.max(
        0,
        createdTask.refundAmountInRubles - createdTask.commissionAmountInRubles,
      );

      await this.model.updateOne({ _id: createdTask._id }, { $set: { refundAmountInRublesAfterCommission } });

      return {
        ...createdTask,
        refundAmountInRublesAfterCommission,
      };
    }

    return createdTask;
  }

  /**
   * Обновляет комиссию задачи казначея
   */
  async updateCommission(
    findData: ITreasurerTaskQuery,
    dto: TreasurerTaskUpdateCommissionDto,
    options?: IBaseOptions,
  ): Promise<ITreasurerTask> {
    const updateData: Partial<ITreasurerTaskUpdate> = {};

    if (dto.commissionPercent !== undefined) {
      updateData.commissionPercent = dto.commissionPercent;
    }

    if (dto.additionalCommissionCurrency !== undefined) {
      updateData.additionalCommissionCurrency = dto.additionalCommissionCurrency;
    }

    if (dto.additionalCommissionAmount !== undefined) {
      updateData.additionalCommissionAmount = dto.additionalCommissionAmount;
    }

    if (dto.additionalCommissionExchangeRate !== undefined) {
      updateData.additionalCommissionExchangeRate = dto.additionalCommissionExchangeRate;
    }

    return this.updateOneOrException(findData, updateData, options);
  }

  async updateOneOrException(
    findData: ITreasurerTaskQuery,
    updateData: ITreasurerTaskUpdate,
    options?: IBaseOptions,
  ): Promise<ITreasurerTask> {
    // Получаем текущую задачу для пересчетов
    const currentTask = await this.findOneOrException(findData);

    // Если обновляется exchangeRate, пересчитываем refundAmountInRubles
    // ВАЖНО: exchangeRate влияет только на обычную комиссию, не на дополнительную
    if (updateData.exchangeRate !== undefined) {
      // Валидация курса
      if (updateData.exchangeRate <= 0) {
        throw new BadRequestException('Exchange rate must be greater than 0');
      }

      const refundAmount = currentTask.refundAmount;

      // Валидация суммы
      if (refundAmount <= 0) {
        this.logger.warn({
          message: 'Cannot recalculate refundAmountInRubles: refundAmount is zero or negative',
          taskId: currentTask._id,
          refundAmount,
        });
        // Не пересчитываем, если сумма некорректна
      } else {
        // Вычисляем сумму в рублях: exchangeRate - прямой курс (например, 1 USD = 80.722 RUB)
        // Для конвертации из валюты контрагента в рубли: refundAmount * exchangeRate
        // Если курс = 1, то валюта контрагента = валюта клиента (RUB), refundAmountInRubles = refundAmount
        const refundAmountInRubles =
          updateData.exchangeRate === 1 ? refundAmount : Math.round(refundAmount * updateData.exchangeRate);

        updateData.refundAmountInRubles = refundAmountInRubles;

        if (updateData.commissionPercent === undefined) {
          const commissionPercent = currentTask.commissionPercent;
          if (commissionPercent !== undefined && commissionPercent > 0) {
            const commissionAmountInRubles = Math.round((refundAmountInRubles * commissionPercent) / 100);
            updateData.commissionAmountInRubles = commissionAmountInRubles;
          }
        }

        // Пересчитываем сумму после вычета комиссий
        // Если commissionPercent обновляется, пересчет будет выполнен в блоке ниже
        if (updateData.commissionPercent === undefined) {
          this.recalculateRefundAmountAfterCommission(updateData, currentTask);
        }
      }
    }

    // Если обновляется commissionPercent, пересчитываем commissionAmountInRubles
    // ВАЖНО: это не влияет на дополнительную комиссию
    if (updateData.commissionPercent !== undefined) {
      // Валидация процента
      if (updateData.commissionPercent < 0 || updateData.commissionPercent > 100) {
        throw new BadRequestException('Commission percent must be between 0 and 100');
      }

      const refundAmountInRubles = updateData.refundAmountInRubles ?? currentTask.refundAmountInRubles;

      if (refundAmountInRubles && refundAmountInRubles > 0) {
        const commissionAmountInRubles = Math.round((refundAmountInRubles * updateData.commissionPercent) / 100);
        updateData.commissionAmountInRubles = commissionAmountInRubles;

        // Пересчитываем сумму после вычета комиссий
        this.recalculateRefundAmountAfterCommission(updateData, currentTask);
      } else {
        this.logger.warn({
          message: 'Cannot recalculate commissionAmountInRubles: refundAmountInRubles is zero or not set',
          taskId: currentTask._id,
          refundAmountInRubles,
        });
      }
    }

    // Если обновляется additionalCommissionAmount, additionalCommissionCurrency или additionalCommissionExchangeRate,
    // пересчитываем additionalCommissionAmountInRubles
    // ВАЖНО: дополнительная комиссия полностью независима от обычной комиссии
    const shouldRecalculateAdditionalCommission =
      updateData.additionalCommissionAmount !== undefined ||
      updateData.additionalCommissionCurrency !== undefined ||
      updateData.additionalCommissionExchangeRate !== undefined;

    if (shouldRecalculateAdditionalCommission) {
      const additionalCommissionAmount =
        updateData.additionalCommissionAmount ?? currentTask.additionalCommissionAmount;
      const additionalCommissionCurrency =
        updateData.additionalCommissionCurrency ?? currentTask.additionalCommissionCurrency;
      const additionalCommissionExchangeRate =
        updateData.additionalCommissionExchangeRate ?? currentTask.additionalCommissionExchangeRate;

      // Проверяем, что все необходимые поля заполнены
      // Пустая строка для валюты и 0 для суммы/курса означают отсутствие дополнительной комиссии
      const hasValidCurrency = additionalCommissionCurrency !== undefined && additionalCommissionCurrency !== '';
      const hasValidAmount = additionalCommissionAmount !== undefined && additionalCommissionAmount > 0;
      const hasValidRate = additionalCommissionExchangeRate !== undefined && additionalCommissionExchangeRate > 0;

      if (hasValidCurrency && hasValidAmount && hasValidRate) {
        // Валидация курса
        if (additionalCommissionExchangeRate <= 0) {
          throw new BadRequestException('Additional commission exchange rate must be greater than 0');
        }

        // Вычисляем сумму в рублях
        // Если валюта RUB или курс = 1, то additionalCommissionAmountInRubles = additionalCommissionAmount
        // Иначе: additionalCommissionAmount * (100 / additionalCommissionExchangeRate)
        const additionalCommissionAmountInRubles =
          additionalCommissionCurrency === AllCurrencies.RUB || additionalCommissionExchangeRate === 1
            ? additionalCommissionAmount
            : Math.round((additionalCommissionAmount * 100) / additionalCommissionExchangeRate);

        updateData.additionalCommissionAmountInRubles = additionalCommissionAmountInRubles;

        this.logger.log({
          message: 'Recalculated additionalCommissionAmountInRubles',
          taskId: currentTask._id,
          additionalCommissionAmount,
          additionalCommissionCurrency,
          additionalCommissionExchangeRate,
          additionalCommissionAmountInRubles,
        });

        // Пересчитываем сумму после вычета комиссий
        this.recalculateRefundAmountAfterCommission(updateData, currentTask);
      } else {
        // Если не все поля заполнены, устанавливаем значения по умолчанию
        updateData.additionalCommissionAmountInRubles = 0;
        // Если валюта не указана, устанавливаем пустую строку
        if (updateData.additionalCommissionCurrency === undefined) {
          updateData.additionalCommissionCurrency = '';
        }
        // Если сумма не указана, устанавливаем 0
        if (updateData.additionalCommissionAmount === undefined) {
          updateData.additionalCommissionAmount = 0;
        }
        // Если курс не указан, устанавливаем 0
        if (updateData.additionalCommissionExchangeRate === undefined) {
          updateData.additionalCommissionExchangeRate = 0;
        }

        this.logger.warn({
          message: 'Cannot recalculate additionalCommissionAmountInRubles: missing required fields, setting defaults',
          taskId: currentTask._id,
          additionalCommissionAmount,
          additionalCommissionCurrency,
          additionalCommissionExchangeRate,
        });

        // Пересчитываем сумму после вычета комиссий (дополнительная комиссия обнулена)
        this.recalculateRefundAmountAfterCommission(updateData, currentTask);
      }
    }

    // Пересчитываем сумму после вычета комиссий, если обновляется refundAmountInRubles напрямую
    // (и при этом не обновляются комиссии, которые уже пересчитали это значение)
    if (
      updateData.refundAmountInRubles !== undefined &&
      updateData.commissionAmountInRubles === undefined &&
      updateData.additionalCommissionAmountInRubles === undefined
    ) {
      this.recalculateRefundAmountAfterCommission(updateData, currentTask);
    }

    // Проверяем, изменились ли поля, влияющие на расчеты
    const calculationFieldsChanged =
      updateData.exchangeRate !== undefined ||
      updateData.commissionPercent !== undefined ||
      updateData.additionalCommissionAmount !== undefined ||
      updateData.additionalCommissionCurrency !== undefined ||
      updateData.additionalCommissionExchangeRate !== undefined;

    // Выполняем обновление
    const updatedTask = await super.updateOneOrException(findData, updateData, options);

    // Если статус установлен в COMPLETED, обнуляем debtAmount в связанных form_payment
    if (updateData.status === TreasurerTaskStatus.COMPLETED) {
      await this.clearDebtAmountForCompletedTask(updatedTask._id.toString());
    }

    // Если изменились поля, влияющие на расчеты, отправляем уведомления клиентам
    if (calculationFieldsChanged) {
      await this.sendFormPaymentNotificationsForTask(updatedTask);
    }

    return updatedTask;
  }

  /**
   * Пересчитывает refundAmountInRublesAfterCommission, вычитая из refundAmountInRubles все комиссии
   */
  private recalculateRefundAmountAfterCommission(updateData: ITreasurerTaskUpdate, currentTask: ITreasurerTask): void {
    const refundAmountInRubles = updateData.refundAmountInRubles ?? currentTask.refundAmountInRubles;
    const commissionAmountInRubles = updateData.commissionAmountInRubles ?? currentTask.commissionAmountInRubles;
    // 0 означает отсутствие дополнительной комиссии
    const additionalCommissionAmountInRubles =
      updateData.additionalCommissionAmountInRubles !== undefined
        ? updateData.additionalCommissionAmountInRubles
        : currentTask.additionalCommissionAmountInRubles ?? 0;

    if (refundAmountInRubles !== undefined && refundAmountInRubles > 0) {
      let totalCommissions = 0;
      if (commissionAmountInRubles !== undefined && commissionAmountInRubles > 0) {
        totalCommissions += commissionAmountInRubles;
      }
      // Дополнительная комиссия: 0 означает отсутствие комиссии
      if (additionalCommissionAmountInRubles > 0) {
        totalCommissions += additionalCommissionAmountInRubles;
      }

      const refundAmountInRublesAfterCommission = Math.max(0, refundAmountInRubles - totalCommissions);
      updateData.refundAmountInRublesAfterCommission = refundAmountInRublesAfterCommission;

      this.logger.log({
        message: 'Recalculated refundAmountInRublesAfterCommission',
        taskId: currentTask._id,
        refundAmountInRubles,
        commissionAmountInRubles,
        additionalCommissionAmountInRubles,
        totalCommissions,
        refundAmountInRublesAfterCommission,
      });
    } else {
      updateData.refundAmountInRublesAfterCommission = undefined;

      this.logger.warn({
        message: 'Cannot recalculate refundAmountInRublesAfterCommission: refundAmountInRubles is zero or not set',
        taskId: currentTask._id,
        refundAmountInRubles,
      });
    }
  }

  /**
   * Обнуляет debtAmount в form_payment, связанных с завершенной задачей казначея
   */
  private async clearDebtAmountForCompletedTask(taskId: string): Promise<void> {
    try {
      const taskObjectId = new Types.ObjectId(taskId);

      // Находим все form_payment, у которых в поле task есть ID этой задачи
      const result = await this.formPaymentModel.updateMany({ task: taskObjectId }, { $set: { debtAmount: 0 } });

      this.logger.log({
        message: 'Cleared debtAmount for form payments with completed treasurer task',
        taskId,
        updatedCount: result.modifiedCount,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to clear debtAmount for completed treasurer task',
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Генерирует платежное поручение казначея для выплаты
   * Использует основную информацию из импортной сделки и финансовые данные из задачи казначея
   */
  async generatePaymentOrder(taskId: string): Promise<IFile> {
    this.logger.debug(`Generating payment order for treasurer task ${taskId}`);

    // 1. Загружаем задачу казначея
    const task = await this.findOneOrException({ _id: taskId });
    if (!task) {
      throw new BadRequestException(`Treasurer task ${taskId} not found`);
    }

    // 2. Загружаем импортную сделку
    // Основная информация берется из импортной сделки (организация, контрагент, банковские реквизиты)
    const importPayment = await this.formPaymentModel
      .findById(task.importPaymentId)
      .populate('agent')
      .populate('organization')
      .exec();

    if (!importPayment) {
      throw new BadRequestException(`Import payment ${task.importPaymentId} not found`);
    }

    // 3. Получаем агента и договор из импортной сделки
    const agent = this.isAgentPopulated(importPayment.agent) ? importPayment.agent : null;
    if (!agent) {
      throw new BadRequestException(`Agent not found for import payment ${task.importPaymentId}`);
    }

    // Получаем полные данные агента через NATS
    const agentData = await this.agentNatsClient.send<IAgent>(AgentPattern.FIND_ONE_OR_EXCEPTION, {
      query: {
        _id: agent._id || agent,
      },
    });

    // Получаем договор
    const contract = await this.contractNatsClient.send<IContract>(ContractPattern.FIND_ONE, {
      query: {
        organization: importPayment.organization?._id || importPayment.organization,
        agent: agentData._id.toString(),
        status: ContractStatus.ACCEPTED,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contract not found for agent and organization');
    }

    // 4. Строим данные для шаблона
    // Основная информация из импортной сделки, финансовые данные из задачи казначея
    const orderData = this.buildTreasurerOrderData(importPayment, task, agentData, contract);

    // 5. Рендерим шаблон
    const htmlString = await this.renderTreasurerOrderTemplate(orderData);

    if (!htmlString) {
      throw new Error('Failed to render treasurer payment order template');
    }

    // 6. Создаем PDF через FileService
    const pdfPayload: ICreatePdfInput = { text: htmlString };
    const pdfFile = await this.fileService.createPdf(pdfPayload);

    if (!pdfFile || !pdfFile._id) {
      throw new Error('Generated PDF file has no ID');
    }

    // 7. Сохраняем PDF в задачу казначея
    await this.updateOneOrException(
      { _id: taskId },
      {
        treasurerOrder: pdfFile._id.toString(),
      },
    );

    // 8. Также сохраняем ID файла в импортную сделку в поле docs.treasurerOrder
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: task.importPaymentId },
      update: {
        docs: {
          treasurerOrder: pdfFile._id.toString(),
        },
      },
    });

    this.logger.log(
      `Payment order generated successfully for treasurer task ${taskId}, fileId: ${pdfFile._id}, saved to form payment ${task.importPaymentId}`,
    );

    return pdfFile;
  }

  /**
   * Строит данные для шаблона платежного поручения казначея
   * Основная информация берется из импортной сделки, финансовые данные из задачи казначея
   */
  private buildTreasurerOrderData(
    importPayment: FormPayment,
    task: ITreasurerTask,
    agent: IAgent,
    contract: IContract,
  ): ITreasurerOrderData {
    // Используем сохраненную валюту возврата из задачи, если она есть, иначе определяем из импортной сделки
    const refundCurrency = task.refundCurrency || importPayment.currency?.counterparty || AllCurrencies.RUB;
    const clientCurrency = importPayment.currency?.client || AllCurrencies.RUB;

    return {
      // Основная информация из импортной сделки
      orderNumber: importPayment.uid || 'n/a',
      orderDate: this.formatDate(new Date()),
      clientOrganizationBusinessForm: importPayment.organization?.businessForm,
      clientOrganizationName: importPayment.organization?.name || 'n/a',
      clientSignerName: importPayment.organization?.signerName || 'n/a',
      agentOrganizationName: agent.organizationName || 'n/a',
      agentContractNumber: contract.number || 'n/a',
      agentContractDate: this.formatDate(contract.date),
      counterpartyName: importPayment.counterparty?.name || 'n/a',
      invoiceNumber: importPayment.invoices?.[0]?.invoiceNumber,
      invoiceDate: this.formatDate(importPayment.invoices?.[0]?.invoiceDate),
      bankName: importPayment.counterparty?.bankName || 'n/a',
      swiftCode: importPayment.counterparty?.swiftCode || 'n/a',
      accountNumber: importPayment.counterparty?.accountNumber || 'n/a',

      // Финансовые данные из задачи казначея
      refundAmount: this.formatNumber(task.refundAmount),
      refundAmountInRubles: this.formatNumber(task.refundAmountInRubles || 0),
      refundAmountInRublesAfterCommission: this.formatNumber(task.refundAmountInRublesAfterCommission || 0),
      exchangeRate: task.exchangeRate ? parseFloat(task.exchangeRate.toFixed(4)) : null,
      paymentByProviderDate: this.formatDate(task.paymentByProviderDate),

      // Комиссии
      commissionPercent: task.commissionPercent || null,
      commissionAmountInRubles: this.formatNumber(task.commissionAmountInRubles || 0),
      additionalCommissionCurrency: task.additionalCommissionCurrency || undefined,
      additionalCommissionAmount: this.formatNumber(task.additionalCommissionAmount || 0),
      additionalCommissionExchangeRate: task.additionalCommissionExchangeRate
        ? parseFloat(task.additionalCommissionExchangeRate.toFixed(4))
        : null,
      additionalCommissionAmountInRubles: this.formatNumber(task.additionalCommissionAmountInRubles || 0),

      // Валюты
      refundCurrency: refundCurrency,
      refundCurrencyIcon: this.getCurrencyIcon(refundCurrency),
      clientCurrency: clientCurrency,
      clientCurrencyIcon: this.getCurrencyIcon(clientCurrency),
    };
  }

  /**
   * Рендерит шаблон платежного поручения казначея
   */
  private async renderTreasurerOrderTemplate(orderData: ITreasurerOrderData): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../templates/', 'treasurer-order.pug');
      const htmlString = renderFile(templatePath, orderData);
      return htmlString;
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to render treasurer order template', {
        error: normalizedError.message,
        stack: normalizedError.stack,
      });
      throw new Error(`Failed to render treasurer order template: ${normalizedError.message}`);
    }
  }

  /**
   * Получает иконку валюты для отображения
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
   * Форматирует число для отображения в шаблоне
   * Суммы в задаче казначея хранятся в минорных единицах (копейки/центы),
   * поэтому делим на 100 для отображения в основных единицах
   */
  private formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return '0';
    const valueInMajorUnits = num / 100;
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valueInMajorUnits);
  }

  /**
   * Форматирует дату для отображения (русская локаль)
   */
  private formatDate(date: Date | string | undefined): string {
    if (!date) return 'n/a';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU');
  }

  /**
   * Проверяет, является ли агент полностью загруженным объектом
   */
  private isAgentPopulated(agent: unknown): agent is IAgent {
    return typeof agent === 'object' && agent !== null && 'organizationName' in agent;
  }

  /**
   * Сохраняет подписанное поручение казначея клиентом
   * @param formPaymentId ID сделки (form payment)
   * @param fileId ID файла подписанного поручения
   * @param accountId ID аккаунта клиента
   */
  async updateOrderSignedByUser(formPaymentId: string, fileId: string, accountId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея по ID импортной сделки и клиенту
    const task = await this.findOneOrException({
      importPaymentId: formPaymentId,
      clientId: accountId,
    });

    if (!task) {
      throw new BadRequestException('Treasurer task not found for this form payment and client');
    }

    // Проверяем, что файл существует и принадлежит аккаунту
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
      account: accountId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сохраняем файл в treasurerOrderSigned в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { treasurerOrderSigned: fileId });

    // Также сохраняем ID файла в сделку в поле docs.treasurerOrderSigned
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: formPaymentId },
      update: {
        docs: {
          treasurerOrderSigned: fileId,
        },
      },
    });

    this.logger.log(`Updated treasurerOrderSigned for task ${task._id} and saved to form payment ${formPaymentId}`);

    return updatedTask;
  }

  /**
   * Удаляет подписанное поручение казначея клиентом
   * @param formPaymentId ID сделки (form payment)
   * @param accountId ID аккаунта клиента
   */
  async deleteOrderSignedByUser(formPaymentId: string, accountId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея по ID импортной сделки и клиенту
    const task = await this.findOneOrException({
      importPaymentId: formPaymentId,
      clientId: accountId,
    });

    if (!task) {
      throw new BadRequestException('Treasurer task not found for this form payment and client');
    }

    if (!task.treasurerOrderSigned) {
      throw new BadRequestException('Treasurer order signed not found');
    }

    const fileId = task.treasurerOrderSigned.toString();

    // Проверяем, что файл существует и принадлежит аккаунту
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
      account: accountId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сначала удаляем запись из базы данных (критично)
    try {
      await this.fileService.deleteOne({ _id: fileId });
    } catch (error) {
      this.logger.error(`Failed to delete file DB record ${fileId}: ${error.message}`);
      throw new BadRequestException('Failed to delete file metadata.');
    }

    // Затем удаляем файл из S3 (не критично, только предупреждение)
    const pathName = `fea/documents/${fileId}`;
    try {
      await this.s3Service.deleteFile(pathName);
    } catch (error) {
      this.logger.warn(`S3 deletion failed for ${fileId}: ${error.message}. File metadata removed, S3 cleanup needed.`);
    }

    // Очищаем поле treasurerOrderSigned в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { treasurerOrderSigned: null });

    // Также очищаем ID файла в сделке в поле docs.treasurerOrderSigned
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: formPaymentId },
      update: {
        treasurerOrderSigned: null,
      },
    });

    this.logger.log(`Deleted treasurerOrderSigned for task ${task._id} and cleared from form payment ${formPaymentId}`);

    return updatedTask;
  }

  /**
   * Загружает неподписанное поручение казначея (казначеем)
   * @param taskId ID задачи казначея
   * @param fileId ID файла поручения
   */
  async updateOrderByTreasurer(taskId: string, fileId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея
    const task = await this.findOneOrException({ _id: taskId });

    if (!task) {
      throw new BadRequestException('Treasurer task not found');
    }

    // Проверяем, что файл существует
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сохраняем файл в treasurerOrder в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { treasurerOrder: fileId });

    // Также сохраняем ID файла в импортную сделку в поле docs.treasurerOrder
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: task.importPaymentId },
      update: {
        docs: {
          treasurerOrder: fileId,
        },
      },
    });

    this.logger.log(`Updated treasurerOrder for task ${task._id} and saved to form payment ${task.importPaymentId}`);

    return updatedTask;
  }

  /**
   * Удаляет неподписанное поручение казначея (казначеем)
   * @param taskId ID задачи казначея
   */
  async deleteOrderByTreasurer(taskId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея
    const task = await this.findOneOrException({ _id: taskId });

    if (!task) {
      throw new BadRequestException('Treasurer task not found');
    }

    if (!task.treasurerOrder) {
      throw new BadRequestException('Treasurer order not found');
    }

    const fileId = task.treasurerOrder.toString();

    // Проверяем, что файл существует
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сначала удаляем запись из базы данных (критично)
    try {
      await this.fileService.deleteOne({ _id: fileId });
    } catch (error) {
      this.logger.error(`Failed to delete file DB record ${fileId}: ${error.message}`);
      throw new BadRequestException('Failed to delete file metadata.');
    }

    // Затем удаляем файл из S3 (не критично, только предупреждение)
    const pathName = `fea/documents/${fileId}`;
    try {
      await this.s3Service.deleteFile(pathName);
    } catch (error) {
      this.logger.warn(`S3 deletion failed for ${fileId}: ${error.message}. File metadata removed, S3 cleanup needed.`);
    }

    // Очищаем поле treasurerOrder в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { treasurerOrder: null });

    // Также очищаем ID файла в импортной сделке в поле docs.treasurerOrder
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: task.importPaymentId },
      update: {
        docs: {
          treasurerOrder: null,
        },
      },
    });

    this.logger.log(
      `Deleted treasurerOrder for task ${task._id} and cleared from form payment ${task.importPaymentId}`,
    );

    return updatedTask;
  }

  /**
   * Прикрепляет подтверждение выплаты по экспортной выручке (казначеем)
   * @param taskId ID задачи казначея
   * @param fileId ID файла подтверждения
   */
  async updateExportRevenueConfirmation(taskId: string, fileId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея
    const task = await this.findOneOrException({ _id: taskId });

    if (!task) {
      throw new BadRequestException('Treasurer task not found');
    }

    // Проверяем, что файл существует
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сохраняем файл в exportRevenueConfirmation в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { exportRevenueConfirmation: fileId });

    // Также сохраняем ID файла в импортную сделку в поле docs.exportRevenueConfirmation
    // Передаем exportRevenueConfirmation на верхнем уровне, чтобы makeUpdate обработал это правильно
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: task.importPaymentId },
      update: {
        exportRevenueConfirmation: fileId,
      },
    });

    this.logger.log(
      `Updated exportRevenueConfirmation for task ${task._id} and saved to form payment ${task.importPaymentId}`,
    );

    return updatedTask;
  }

  /**
   * Удаляет подтверждение выплаты по экспортной выручке (казначеем)
   * @param taskId ID задачи казначея
   */
  async deleteExportRevenueConfirmation(taskId: string): Promise<ITreasurerTask> {
    // Находим задачу казначея
    const task = await this.findOneOrException({ _id: taskId });

    if (!task) {
      throw new BadRequestException('Treasurer task not found');
    }

    if (!task.exportRevenueConfirmation) {
      throw new BadRequestException('Export revenue confirmation not found');
    }

    const fileId = task.exportRevenueConfirmation.toString();

    // Проверяем, что файл существует
    const file = await this.fileNatsClient.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Сначала удаляем запись из базы данных (критично)
    try {
      await this.fileService.deleteOne({ _id: fileId });
    } catch (error) {
      this.logger.error(`Failed to delete file DB record ${fileId}: ${error.message}`);
      throw new BadRequestException('Failed to delete file metadata.');
    }

    // Затем удаляем файл из S3 (не критично, только предупреждение)
    const pathName = `fea/documents/${fileId}`;
    try {
      await this.s3Service.deleteFile(pathName);
    } catch (error) {
      this.logger.warn(`S3 deletion failed for ${fileId}: ${error.message}. File metadata removed, S3 cleanup needed.`);
    }

    // Очищаем поле exportRevenueConfirmation в задаче казначея
    const updatedTask = await this.updateOneOrException({ _id: task._id }, { exportRevenueConfirmation: null });

    // Также очищаем ID файла в импортной сделке в поле docs.exportRevenueConfirmation
    // Передаем exportRevenueConfirmation: null на верхнем уровне, чтобы makeUpdate обработал это правильно через $unset
    await this.formPaymentNatsClient.send(FormPaymentPattern.UPDATE_ONE, {
      query: { _id: task.importPaymentId },
      update: {
        exportRevenueConfirmation: null,
      },
    });

    this.logger.log(
      `Deleted exportRevenueConfirmation for task ${task._id} and cleared from form payment ${task.importPaymentId}`,
    );

    return updatedTask;
  }

  /**
   * Отправляет уведомления через сокеты для импортной формы платежа при изменении расчетов
   * @param task Задача казначея
   */
  private async sendFormPaymentNotificationsForTask(task: ITreasurerTask): Promise<void> {
    try {
      // Отправляем уведомления только для импортной формы платежа
      if (!task.importPaymentId) {
        this.logger.warn(`No import payment ID found for treasurer task ${task._id}, skipping notifications`);
        return;
      }

      const importPaymentId = task.importPaymentId.toString();

      // Загружаем импортную форму платежа
      const formPayment = await this.formPaymentNatsClient.send<IFormPayment>(FormPaymentPattern.FIND_ONE, {
        _id: importPaymentId,
      });

      if (!formPayment) {
        this.logger.warn(
          `No form payment found for ID ${importPaymentId}, skipping notifications for task ${task._id}`,
        );
        return;
      }

      // Отправляем уведомление через очередь
      await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
        action: SocketMessageAction.UPDATE,
        formPayment,
      });

      this.logger.log(
        `Sent form payment update notification for treasurer task ${task._id} (import payment: ${importPaymentId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send form payment update notification for treasurer task ${task._id}: ${error.message}`,
        error.stack,
      );
      // Не пробрасываем ошибку, чтобы не прервать основной процесс обновления
    }
  }
}
