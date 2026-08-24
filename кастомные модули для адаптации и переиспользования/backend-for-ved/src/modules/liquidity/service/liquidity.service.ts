import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import { ILiquidityCreate, ILiquidityQuery, ILiquidityService } from './liquidity.service.interface';
import { Liquidity } from './liquidity.schema';
import { BaseService } from 'lib/services/base/base.service';
import {
  ILiquidApply,
  ILiquidity,
  LiquidityRates,
  ILiquidityGlass,
  ILiquidityConvert,
  LiquidityExportRates,
  LiquidityCommitmentsRates,
  LiquidityProviderRates,
  LiquidityProviderOrganization,
  LiquidityImportRates,
  LiquidityAgentRates,
} from 'lib/interfaces/models/liquidity.interface';
import { IBaseOptions, UpdatePartial } from 'lib/services/base/base.service.interface';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentDirection, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import * as _ from 'lodash';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { CurrencyPattern, CurrencySource, RateStrategy } from '../../../lib/enums/models/currency.enums';
import { AccountRole } from '../../../lib/enums/models/account.enums';
import { OrganizationType } from '../../../lib/enums/models/organization.enums';
import { Organization } from '../../../modules/organization/service/organization.schema';
import { OrganizationPattern } from '../../../lib/enums/models/organization.enums';
import { Model } from 'mongoose';
import { AgentPattern } from 'lib/enums/models/agent.enums';
import { IAgent } from 'lib/interfaces/models/agent.interface';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from '../../../lib/enums/models/socket.enum';
import { ISocketMessageData } from '../../../lib/interfaces/models/socket.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { LiquidityJobQueuePatterns } from '../../../lib/enums/models/liquidity.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';

@Injectable()
export class LiquidityService
  extends BaseService<ILiquidity, Liquidity, ILiquidityQuery, IBaseOptions, ILiquidityCreate>
  implements ILiquidityService
{
  private readonly logger = new Logger();
  constructor(
    @InjectModel(Liquidity.name) readonly model: PaginateModel<Liquidity>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
    @InjectNats() readonly client: NatsClientProxy,
    @InjectQueue(JobQueueName.LIQUIDITY_NOTIFY_JOB_QUEUE) private readonly liquidityNotifyQueue: Queue,
  ) {
    super();
  }

  private async _mapValuesAsync(
    collection: LiquidityRates,
    asyncFn: (amount: number, key: keyof LiquidityRates, index: number, collection: LiquidityRates) => Promise<number>,
  ): Promise<LiquidityRates> {
    const entries = Object.entries(collection) as [keyof LiquidityRates, number][];
    const promises = entries.map(([key, value], index) =>
      asyncFn(value, key, index, collection).then((resolved) => [key, resolved] as const),
    );
    const resolved = await Promise.all(promises);
    return Object.fromEntries(resolved) as LiquidityRates;
  }

  async getLiquidityGlass(): Promise<ILiquidityGlass> {
    const model = await super.findOneOrException({});

    const importTarget = AllCurrencies.RUB;
    const exportTarget = AllCurrencies.USD; // Параметр оставлен для обратной совместимости _buildLiquidityGlass

    return this._buildLiquidityGlass(model, importTarget, exportTarget);
  }

  async applyLiquid(params: ILiquidApply) {
    const liquidityDoc = await this.model.findOne({}).exec();

    if (!liquidityDoc) {
      throw new Error('Liquidity document not found');
    }

    if (params.direction === FormPaymentDirection.IMPORT) {
      const agentName = (await this._resolveAgentName(params.agentName, params.agentId)) || 'Unknown Agent';
      await this._updateImportWithAgent(liquidityDoc, params.currency, params.amount, agentName);
    } else if (params.direction === FormPaymentDirection.EXPORT) {
      // Для export нужна информация о провайдере
      if (!params.providerName && params.providerId) {
        // Получаем название провайдера по ID
        try {
          const organization = await this.client.send(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
            query: { _id: params.providerId, type: OrganizationType.PROVIDER, isActive: true },
          });
          params.providerName = organization.name;
        } catch (error) {
          params.providerName = 'Unknown Provider';
        }
      }

      const finalProviderName = params.providerName || 'Unknown Provider';

      await this._updateExportWithProvider(
        liquidityDoc,
        params.currency,
        params.amount,
        finalProviderName,
        params.providerId,
        params.accountNumber,
      );
    }

    const updatedLiquidity = await super.findOneOrException({});
    await this.liquidityNotifyQueue.add(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS, updatedLiquidity);
  }

  async applyLiquidsBatch(params: ILiquidApply[]) {
    this.logger.log('Start apply batch', params);
    if (!params?.length) {
      return;
    }

    const liquidityDoc = await this.model.findOne({}).exec();

    if (!liquidityDoc) {
      throw new Error('Liquidity document not found');
    }

    // Разделяем на import и export
    const importAgentUpdates: Array<{
      currency: AllCurrencies;
      amount: number;
      agentName?: string;
      agentId?: string;
    }> = [];
    const exportUpdates: Array<{
      currency: AllCurrencies;
      amount: number;
      providerName?: string;
      providerId?: string;
      accountNumber?: string;
    }> = [];

    for (const param of params) {
      if (param.direction === FormPaymentDirection.IMPORT) {
        importAgentUpdates.push({
          currency: param.currency,
          amount: param.amount,
          agentName: param.agentName,
          agentId: param.agentId,
        });
      } else if (param.direction === FormPaymentDirection.EXPORT) {
        exportUpdates.push({
          currency: param.currency,
          amount: param.amount,
          providerName: param.providerName,
          providerId: param.providerId,
          accountNumber: param.accountNumber,
        });
      }
    }

    for (const update of importAgentUpdates) {
      const agentName = (await this._resolveAgentName(update.agentName, update.agentId)) || 'Unknown Agent';
      await this._updateImportWithAgent(liquidityDoc, update.currency, update.amount, agentName);
    }

    // Обновляем export (новая структура с провайдерами)
    for (const exportUpdate of exportUpdates) {
      let providerName = exportUpdate.providerName;
      if (!providerName && exportUpdate.providerId) {
        try {
          const organization = await this.client.send(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
            query: { _id: exportUpdate.providerId, type: OrganizationType.PROVIDER, isActive: true },
          });
          providerName = organization.name;
        } catch (error) {
          this.logger.warn(`Failed to get provider name for id ${exportUpdate.providerId}: ${error}`);
          providerName = 'Unknown Provider';
        }
      }

      const finalProviderName = providerName || 'Unknown Provider';
      await this._updateExportWithProvider(
        liquidityDoc,
        exportUpdate.currency,
        exportUpdate.amount,
        finalProviderName,
        exportUpdate.providerId,
        exportUpdate.accountNumber,
      );
    }

    const updatedLiquidity = await super.findOneOrException({});
    await this.liquidityNotifyQueue.add(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS, updatedLiquidity);
  }

  async convertLiquidity(params: ILiquidityConvert): Promise<ILiquidity> {
    const batch: ILiquidApply[] = [];

    const { from, to } = params;
    const fromAmount = from.amount;
    const toAmount = to.amount;

    if (Number.isNaN(fromAmount + toAmount)) {
      if (Number.isNaN(fromAmount)) {
        throw new BadRequestException('Liquidity conversion "from" amount must be a number');
      }

      if (Number.isNaN(toAmount)) {
        throw new BadRequestException('Liquidity conversion "to" amount must be a number');
      }
    }

    if (fromAmount < 0 || toAmount < 0) {
      throw new BadRequestException('Liquidity conversion amounts cannot be negative');
    }

    if (fromAmount !== 0) {
      batch.push({
        direction: from.type,
        currency: from.currency,
        amount: -fromAmount,
      });
    }

    if (toAmount !== 0) {
      batch.push({
        direction: to.type,
        currency: to.currency,
        amount: toAmount,
      });
    }

    if (batch.length) {
      await this.applyLiquidsBatch(batch);
    }

    return this.findOneOrException({});
  }

  async applyOrderPayment(payment: IFormPayment) {
    this.logger.log('Start apply order', payment);
    const liquidityDoc = await this.model.findOne({}).exec();

    if (!liquidityDoc) {
      throw new Error('Liquidity document not found');
    }

    this.logger.log(liquidityDoc);

    let liqImport = payment.totals.coverAmount;
    let liqExport = payment.totals.amount;

    if (_.isUndefined(liqImport)) {
      return;
    }

    if (payment.direction === FormPaymentDirection.IMPORT) {
      liqExport = liqExport * -1;
    } else {
      liqImport = liqImport * -1;
    }

    if (payment.direction === FormPaymentDirection.IMPORT) {
      const { agentId, agentName } = this._extractAgentIdentifiers(payment.agent as string | IAgent | undefined);
      const resolvedAgentName = (await this._resolveAgentName(agentName, agentId)) || 'Unknown Agent';
      await this._updateImportWithAgent(liquidityDoc, payment.currency.client, liqImport, resolvedAgentName);
    }

    // Обновляем export с учетом провайдера (новая структура)
    if (payment.direction === FormPaymentDirection.EXPORT && payment.providerOrganization) {
      let providerName: string;
      let providerId: string | undefined;
      let accountNumber: string | undefined;

      if (typeof payment.providerOrganization === 'string') {
        // Если providerOrganization - строка (ID)
        providerId = payment.providerOrganization;
        try {
          const organization = await this.client.send(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
            query: { _id: payment.providerOrganization, type: OrganizationType.PROVIDER, isActive: true },
          });
          providerName = organization.name || 'Unknown Provider';
        } catch (error) {
          this.logger.warn(`Failed to get provider name for id ${payment.providerOrganization}: ${error}`);
          providerName = 'Unknown Provider';
        }
      } else {
        // Если providerOrganization - объект
        // Извлекаем имя провайдера
        providerName = payment.providerOrganization.name?.trim() || 'Unknown Provider';

        // Извлекаем ID провайдера (приоритет: refOrganizationId > _id)
        if (payment.providerOrganization.refOrganizationId) {
          providerId =
            typeof payment.providerOrganization.refOrganizationId === 'string'
              ? payment.providerOrganization.refOrganizationId
              : String(payment.providerOrganization.refOrganizationId);
        } else if (payment.providerOrganization._id) {
          providerId =
            typeof payment.providerOrganization._id === 'string'
              ? payment.providerOrganization._id
              : String(payment.providerOrganization._id);
        }

        // Извлекаем accountNumber из providerOrganization.requisite.accountNumber
        // requisite может быть массивом или одним объектом (IRequisites или расширенный объект)
        if (payment.providerOrganization.requisite) {
          const requisite = payment.providerOrganization.requisite;
          if (Array.isArray(requisite) && requisite.length > 0) {
            // Если массив, берем первый элемент
            const firstRequisite = requisite[0];
            if (firstRequisite && typeof firstRequisite === 'object' && 'accountNumber' in firstRequisite) {
              accountNumber = firstRequisite.accountNumber?.trim() || undefined;
            }
          } else if (typeof requisite === 'object' && requisite !== null) {
            // Если объект, проверяем наличие accountNumber
            if ('accountNumber' in requisite && requisite.accountNumber) {
              accountNumber =
                typeof requisite.accountNumber === 'string'
                  ? requisite.accountNumber.trim()
                  : String(requisite.accountNumber).trim();
              // Если после trim пустая строка, делаем undefined
              if (accountNumber === '') {
                accountNumber = undefined;
              }
            }
          }
        }
      }

      const currency = payment.currency.counterparty;
      await this._updateExportWithProvider(liquidityDoc, currency, liqExport, providerName, providerId, accountNumber);
    }

    this.logger.log(liquidityDoc);

    const updatedLiquidity = await super.findOneOrException({});

    await this.liquidityNotifyQueue.add(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS, updatedLiquidity);
  }

  /**
   * Обновляет стакан обязательств при изменении статуса сделки
   * Для всех сделок (импорт и экспорт) commitments хранятся в валюте контрагента (totals.amount)
   * Пополнение:
   * - импортная сделка (авансовая и постоплатная) переходит в SIGNING_ORDER_ACCEPTED
   * - постоплатная сделка (импорт и экспорт) переходит в ADVANCE_SIGNING_ORDER_ACCEPTED (ЗАКОММЕНТИРОВАНО)
   * - экспортная сделка переходит в PAYMENT_REFUND_SENT (возврат валютного платежа)
   * Списание:
   * - импортная сделка переходит в PAYMENT_SENT
   * - импортная сделка переходит в PAYMENT_REFUND_SENT (возврат средств клиенту)
   */
  async updateCommitmentsOnStatusChange(
    payment: IFormPayment,
    oldStatus: FormPaymentStatus,
    newStatus: FormPaymentStatus,
  ): Promise<void> {
    if (!payment.totals?.amount || !payment.currency) {
      return;
    }

    // Определяем валюту: для всех сделок (импорт и экспорт) используем валюту контрагента
    const currency = payment.currency.counterparty;

    if (!currency) {
      return;
    }

    // Для всех сделок (импорт и экспорт) используем totals.amount в валюте контрагента
    const amount = payment.totals.amount;
    let delta = 0;

    const isImport = payment.direction === FormPaymentDirection.IMPORT;
    const isExport = payment.direction === FormPaymentDirection.EXPORT;

    // Пополнение: импортная сделка (авансовая и постоплатная) переходит в SIGNING_ORDER_ACCEPTED
    if (
      isImport &&
      newStatus === FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
      oldStatus !== FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
      (oldStatus === FormPaymentStatus.SIGNING_ORDER_VERIFICATION ||
        oldStatus === FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION)
    ) {
      delta = amount;
    }
    // Пополнение: постоплатная сделка (импорт и экспорт) переходит в ADVANCE_SIGNING_ORDER_ACCEPTED
    // ЗАКОММЕНТИРОВАНО: убрано пополнение стакана обязательств при этом кейсе
    // else if (
    //   isPostPayment &&
    //   newStatus === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED &&
    //   oldStatus !== FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED
    // ) {
    //   delta = amount;
    // }
    // Пополнение: экспортная сделка переходит в PAYMENT_REFUND_SENT (возврат валютного платежа)
    else if (isExport && newStatus === FormPaymentStatus.PAYMENT_REFUND_SENT) {
      delta = amount;
    }
    // Списание: импортная сделка переходит в PAYMENT_SENT
    else if (isImport && newStatus === FormPaymentStatus.PAYMENT_SENT && oldStatus !== FormPaymentStatus.PAYMENT_SENT) {
      delta = -amount;
    }
    // Списание: импортная сделка переходит в PAYMENT_REFUND_SENT (возврат средств клиенту)
    else if (isImport && newStatus === FormPaymentStatus.PAYMENT_REFUND_SENT) {
      delta = -amount;
    }
    // Если статус не изменился относительно обязательств, ничего не делаем
    else {
      return;
    }

    // Получаем информацию о провайдере
    let providerName: string = 'Unknown Provider';
    let providerId: string | undefined;
    let accountNumber: string | undefined;

    if (payment.providerOrganization) {
      if (typeof payment.providerOrganization === 'string') {
        providerId = payment.providerOrganization;
        try {
          const organization = await this.client.send(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
            query: { _id: payment.providerOrganization, type: OrganizationType.PROVIDER, isActive: true },
          });
          providerName = organization.name?.trim() || 'Unknown Provider';
        } catch (error) {
          this.logger.warn(`Failed to get provider name for id ${payment.providerOrganization}: ${error}`);
        }
      } else {
        // Извлекаем имя провайдера
        providerName = payment.providerOrganization.name?.trim() || 'Unknown Provider';

        // Извлекаем ID провайдера (приоритет: refOrganizationId > _id)
        if (payment.providerOrganization.refOrganizationId) {
          providerId =
            typeof payment.providerOrganization.refOrganizationId === 'string'
              ? payment.providerOrganization.refOrganizationId
              : String(payment.providerOrganization.refOrganizationId);
        } else if (payment.providerOrganization._id) {
          providerId =
            typeof payment.providerOrganization._id === 'string'
              ? payment.providerOrganization._id
              : String(payment.providerOrganization._id);
        }

        // Извлекаем accountNumber из providerOrganization.requisite.accountNumber
        // requisite может быть массивом или одним объектом (IRequisites или расширенный объект)
        if (payment.providerOrganization.requisite) {
          const requisite = payment.providerOrganization.requisite;
          if (Array.isArray(requisite) && requisite.length > 0) {
            // Если массив, берем первый элемент
            const firstRequisite = requisite[0];
            if (firstRequisite && typeof firstRequisite === 'object' && 'accountNumber' in firstRequisite) {
              accountNumber = firstRequisite.accountNumber?.trim() || undefined;
            }
          } else if (typeof requisite === 'object' && requisite !== null) {
            // Если объект, проверяем наличие accountNumber
            if ('accountNumber' in requisite && requisite.accountNumber) {
              accountNumber =
                typeof requisite.accountNumber === 'string'
                  ? requisite.accountNumber.trim()
                  : String(requisite.accountNumber).trim();
              // Если после trim пустая строка, делаем undefined
              if (accountNumber === '') {
                accountNumber = undefined;
              }
            }
          }
        }
      }
    }

    // Обновляем commitments с учетом провайдера и счета

    const liquidityDoc = await this.model.findOne({}).exec();

    if (!liquidityDoc) {
      throw new Error('Liquidity document not found');
    }

    await this._updateCommitmentsWithProvider(liquidityDoc, currency, delta, providerName, providerId, accountNumber);

    const updatedLiquidity = await super.findOneOrException({});
    await this.liquidityNotifyQueue.add(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS, updatedLiquidity);
  }

  async updateByAdmin(findData: ILiquidityQuery, updateData: UpdatePartial<Liquidity>): Promise<ILiquidity> {
    const updatedLiquidity = await this.updateOne(findData, updateData);

    if (updatedLiquidity) {
      // Получаем Mongoose документ для работы с markModified и save
      const liquidityDoc = await this.model.findOne(await this.makeQuery(findData)).exec();
      let needsSave = false;

      // Если обновлялся экспортный стакан, пересчитываем totalAmount с конвертацией всех валют в USD
      if (
        updateData.export &&
        typeof updateData.export === 'object' &&
        !Array.isArray(updateData.export) &&
        Object.keys(updateData.export).length > 0 &&
        updatedLiquidity.export &&
        liquidityDoc &&
        liquidityDoc.export
      ) {
        liquidityDoc.export.totalAmount = await this._calculateGlassTotalAmountInUSD(liquidityDoc.export, 'export');
        liquidityDoc.markModified('export');
        updatedLiquidity.export.totalAmount = liquidityDoc.export.totalAmount;
        needsSave = true;
      }

      // Если обновлялся стакан обязательств, пересчитываем totalAmount с конвертацией всех валют в USD
      if (
        updateData.commitments &&
        typeof updateData.commitments === 'object' &&
        !Array.isArray(updateData.commitments) &&
        Object.keys(updateData.commitments).length > 0 &&
        updatedLiquidity.commitments &&
        liquidityDoc &&
        liquidityDoc.commitments
      ) {
        liquidityDoc.commitments.totalAmount = await this._calculateGlassTotalAmountInUSD(
          liquidityDoc.commitments,
          'commitments',
        );
        liquidityDoc.markModified('commitments');
        updatedLiquidity.commitments.totalAmount = liquidityDoc.commitments.totalAmount;
        needsSave = true;
      }

      if (needsSave && liquidityDoc) {
        await liquidityDoc.save();
      }

      await this.liquidityNotifyQueue.add(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS, updatedLiquidity);
    }

    return updatedLiquidity;
  }

  async sendLiquidityUpdateNotifications(liquidity: ILiquidity): Promise<void> {
    try {
      // Строим стакан ликвидности один раз для всех валют
      const glass = await this._buildLiquidityGlass(liquidity, AllCurrencies.RUB, AllCurrencies.USD);

      // Broadcast в комнату role:user для всех пользователей с ролью USER без commitments
      const glassWithoutCommitments: Omit<ILiquidityGlass, 'commitments'> = {
        import: glass.import,
        export: glass.export,
      };

      const userRoomNotification: ISocketMessageData<Omit<ILiquidityGlass, 'commitments'>> = {
        context: SocketMessageContext.LIQUIDITY_SHORT,
        action: SocketMessageAction.UPDATE,
        payload: glassWithoutCommitments,
        room: `role:${AccountRole.USER}`,
      };

      // Broadcast в общую комнату привилегированных ролей с commitments
      const privilegedRoomNotification: ISocketMessageData<ILiquidityGlass> = {
        context: SocketMessageContext.LIQUIDITY_SHORT,
        action: SocketMessageAction.UPDATE,
        payload: glass,
        room: 'role:privileged',
      };

      await Promise.all([
        this.client.emit(SocketEventPattern.BROADCAST_MANY_AUTHORIZED, [userRoomNotification]),
        this.client.emit(SocketEventPattern.BROADCAST_MANY_AUTHORIZED, [privilegedRoomNotification]),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to send liquidity update notifications: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async _buildLiquidityGlass(
    liquidity: ILiquidity,
    importTarget: AllCurrencies,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exportTarget: AllCurrencies, // Параметр оставлен для обратной совместимости API, но не используется в новой логике
  ): Promise<ILiquidityGlass> {
    const convertTo = async (value: LiquidityRates, target: AllCurrencies): Promise<number> => {
      const converted = await this._mapValuesAsync(value, async (amount: number, fromSymbol: AllCurrencies) => {
        if (fromSymbol !== target) {
          const { amount: result } = await this.client.send(CurrencyPattern.CONVERT, {
            amount,
            fromSymbol,
            toSymbol: target,
            sources: [CurrencySource.OPEN_EXCHANGE],
            strategy: RateStrategy.BASE_WEAKER,
          });
          amount = result;
        }
        return _.round(amount, 2);
      });

      const sum = _.sum(_.values(converted));
      return _.round(sum, 2);
    };

    const importData: LiquidityImportRates = liquidity.import || { totalAmount: 0 };
    this._initializeAllCurrenciesInImport(importData);

    const importCurrencyTotals = this._extractImportCurrencyTotals(importData);
    const importTotal = await convertTo(importCurrencyTotals, importTarget);

    // Теперь данные export и commitments уже хранятся в БД с детализацией по провайдерам
    // Инициализируем, если их нет, и убеждаемся, что все валюты присутствуют
    const exportData: LiquidityExportRates = liquidity.export || ({ totalAmount: 0 } as LiquidityExportRates);
    this._initializeAllCurrenciesInExport(exportData);

    const commitmentsData: LiquidityCommitmentsRates =
      liquidity.commitments ||
      ({
        totalAmount: 0,
      } as LiquidityCommitmentsRates);
    this._initializeAllCurrenciesInCommitments(commitmentsData);

    return {
      import: {
        currencies: importCurrencyTotals,
        total: { amount: importTotal, currency: importTarget },
        agents: importData,
      },
      export: exportData,
      commitments: commitmentsData,
    };
  }

  /**
   * Инициализирует все валюты в import с amount: 0
   */
  private _initializeAllCurrenciesInImport(importData: LiquidityImportRates): void {
    Object.values(AllCurrencies).forEach((currency) => {
      if (!importData[currency]) {
        importData[currency] = { amount: 0 };
      }
    });
  }

  private _extractImportCurrencyTotals(importData: LiquidityImportRates): LiquidityRates {
    const totals = {} as LiquidityRates;
    Object.values(AllCurrencies).forEach((currency) => {
      const currencyEntry = importData[currency];
      if (currencyEntry && typeof currencyEntry === 'object' && 'amount' in currencyEntry) {
        totals[currency] = (currencyEntry as LiquidityAgentRates).amount || 0;
      } else {
        totals[currency] = 0;
      }
    });
    return totals;
  }

  /**
   * Инициализирует все валюты в export с amount: 0 и пустым массивом providerOrganization (новая структура)
   */
  private _initializeAllCurrenciesInExport(exportData: LiquidityExportRates): void {
    Object.values(AllCurrencies).forEach((currency) => {
      if (!exportData[currency]) {
        exportData[currency] = { amount: 0, providerOrganization: [] };
      } else {
        const currencyData = exportData[currency] as LiquidityProviderRates;
        if (currencyData && typeof currencyData === 'object' && 'amount' in currencyData) {
          // Убеждаемся, что массив providerOrganization существует
          if (!currencyData.providerOrganization) {
            currencyData.providerOrganization = [];
          }
        }
      }
    });
  }

  /**
   * Инициализирует все валюты в commitments с amount: 0 и пустым массивом providerOrganization (новая структура)
   */
  private _initializeAllCurrenciesInCommitments(commitmentsData: LiquidityCommitmentsRates): void {
    Object.values(AllCurrencies).forEach((currency) => {
      if (!commitmentsData[currency]) {
        commitmentsData[currency] = { amount: 0, providerOrganization: [] };
      } else {
        const currencyData = commitmentsData[currency] as LiquidityProviderRates;
        if (currencyData && typeof currencyData === 'object' && 'amount' in currencyData) {
          // Убеждаемся, что массив providerOrganization существует
          if (!currencyData.providerOrganization) {
            currencyData.providerOrganization = [];
          }
        }
      }
    });
  }

  /**
   * Обновляет import стакан с учетом агента
   */
  private async _updateImportWithAgent(
    liquidityDoc: Liquidity,
    currency: AllCurrencies,
    amount: number,
    agentName: string,
  ): Promise<void> {
    if (!liquidityDoc.import) {
      liquidityDoc.import = { totalAmount: 0 };
    }

    this._initializeAllCurrenciesInImport(liquidityDoc.import);

    if (!liquidityDoc.import[currency]) {
      liquidityDoc.import[currency] = { amount: 0 };
    }

    const currencyData = liquidityDoc.import[currency] as LiquidityAgentRates;
    if (!currencyData[agentName]) {
      currencyData[agentName] = 0;
    }

    currencyData[agentName] = _.round((currencyData[agentName] || 0) + amount, 2);

    currencyData.amount = _.round(
      Object.keys(currencyData)
        .filter((key) => key !== 'amount')
        .reduce((sum, key) => sum + (currencyData[key] || 0), 0),
      2,
    );

    liquidityDoc.import.totalAmount = _.round(
      Object.entries(liquidityDoc.import)
        .filter(([key]) => key !== 'totalAmount')
        .reduce((sum, [, val]) => {
          if (typeof val === 'object' && val !== null && 'amount' in val) {
            return sum + ((val as LiquidityAgentRates).amount || 0);
          }
          return sum;
        }, 0),
      2,
    );

    liquidityDoc.markModified('import');
    await liquidityDoc.save();
  }

  /**
   * Получает делитель для перевода копеек в основные единицы валюты
   * Для большинства валют это 100, для JPY - 1 (нет копеек)
   */
  private _getCurrencyDivider(currency: AllCurrencies): number {
    // JPY не имеет дробных единиц
    if (currency === AllCurrencies.JPY) {
      return 1;
    }
    // Для всех остальных валют используем 100 (копейки/центы)
    return 100;
  }

  /**
   * Рассчитывает общую сумму стакана (export или commitments) в USD с конвертацией всех валют
   * Суммы в стакане хранятся в копейках, поэтому нужно перевести в основные единицы перед конвертацией
   * @param glassData - данные стакана (LiquidityExportRates или LiquidityCommitmentsRates)
   * @param glassName - название стакана для логирования (опционально)
   */
  private async _calculateGlassTotalAmountInUSD(
    glassData: LiquidityExportRates | LiquidityCommitmentsRates,
    glassName?: string,
  ): Promise<number> {
    const targetCurrency = AllCurrencies.USD;
    const allCurrencies = Object.values(AllCurrencies);
    let totalInUSDCents = 0;

    // Проходим по всем валютам в стакане
    for (const [key, value] of Object.entries(glassData)) {
      // Пропускаем поле totalAmount
      if (key === 'totalAmount') {
        continue;
      }

      // Проверяем, что ключ является валидной валютой
      if (!allCurrencies.includes(key as AllCurrencies)) {
        continue;
      }

      // Проверяем, что это валюта с данными
      if (typeof value === 'object' && value !== null && 'amount' in value) {
        const currencyData = value as LiquidityProviderRates;
        const currencyAmountInCents = currencyData.amount || 0;

        if (currencyAmountInCents === 0) {
          continue;
        }

        // Определяем валюту по ключу
        const currency = key as AllCurrencies;

        // Конвертируем в USD, если валюта не USD
        if (currency === targetCurrency) {
          totalInUSDCents += currencyAmountInCents;
        } else {
          try {
            // Переводим копейки в основные единицы
            const currencyDivider = this._getCurrencyDivider(currency);
            const currencyAmountInMainUnits = currencyAmountInCents / currencyDivider;

            // Конвертируем основные единицы
            const { amount: convertedAmountInMainUnits } = await this.client.send(CurrencyPattern.CONVERT, {
              amount: currencyAmountInMainUnits,
              fromSymbol: currency,
              toSymbol: targetCurrency,
              sources: [CurrencySource.OPEN_EXCHANGE],
              strategy: RateStrategy.BASE_WEAKER,
            });

            // Переводим обратно в копейки USD (умножаем на 100)
            const usdDivider = this._getCurrencyDivider(targetCurrency);
            const convertedAmountInUSDCents = convertedAmountInMainUnits * usdDivider;

            totalInUSDCents += convertedAmountInUSDCents;
          } catch (error) {
            this.logger.warn(
              `Failed to convert ${currency} to ${targetCurrency} for ${glassName || 'glass'} total amount: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            // В случае ошибки конвертации не добавляем сумму, чтобы не исказить результат
          }
        }
      }
    }

    // Округляем до целого числа копеек
    return Math.round(totalInUSDCents);
  }

  /**
   * Обновляет export стакан с учетом провайдера и счета (новая структура)
   */
  private async _updateExportWithProvider(
    liquidityDoc: Liquidity,
    currency: AllCurrencies,
    amount: number,
    providerName: string,
    providerId?: string,
    accountNumber?: string,
  ): Promise<void> {
    if (!liquidityDoc.export) {
      liquidityDoc.export = { totalAmount: 0 } as LiquidityExportRates;
      this._initializeAllCurrenciesInExport(liquidityDoc.export);
    }

    if (!liquidityDoc.export[currency]) {
      liquidityDoc.export[currency] = { amount: 0, providerOrganization: [] };
    }

    const currencyData = liquidityDoc.export[currency] as LiquidityProviderRates;

    // Инициализируем массив providerOrganization если его нет
    if (!currencyData.providerOrganization) {
      currencyData.providerOrganization = [];
    }

    // Нормализуем данные для поиска
    const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
    const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

    // Ищем существующую запись с таким же providerId и accountNumber
    // Важно: записи с пустыми id и accountNumber должны объединяться в одну
    const existingEntry = currencyData.providerOrganization.find(
      (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
    );

    if (existingEntry) {
      existingEntry.amount = _.round(existingEntry.amount + amount, 2);
      existingEntry.name = providerName; // Обновляем имя на случай, если оно изменилось
    } else {
      // Создаем новую запись
      const newEntry: LiquidityProviderOrganization = {
        name: providerName,
        id: normalizedProviderId,
        amount: _.round(amount, 2),
        accountNumber: normalizedAccountNumber,
      };
      currencyData.providerOrganization.push(newEntry);
    }

    // Пересчитываем amount для валюты (сумма по всем провайдерам)
    currencyData.amount = _.round(
      currencyData.providerOrganization.reduce((sum, org) => sum + (org.amount || 0), 0),
      2,
    );

    // Пересчитываем totalAmount с конвертацией всех валют в USD
    liquidityDoc.export.totalAmount = await this._calculateGlassTotalAmountInUSD(liquidityDoc.export, 'export');

    liquidityDoc.markModified('export');

    await liquidityDoc.save();
  }

  /**
   * Обновляет commitments стакан с учетом провайдера и счета (новая структура)
   */
  private async _updateCommitmentsWithProvider(
    liquidityDoc: Liquidity,
    currency: AllCurrencies,
    amount: number,
    providerName: string,
    providerId?: string,
    accountNumber?: string,
  ): Promise<void> {
    if (!liquidityDoc.commitments) {
      liquidityDoc.commitments = { totalAmount: 0 } as LiquidityCommitmentsRates;
      this._initializeAllCurrenciesInCommitments(liquidityDoc.commitments);
    }

    if (!liquidityDoc.commitments[currency]) {
      liquidityDoc.commitments[currency] = { amount: 0, providerOrganization: [] };
    }

    const currencyData = liquidityDoc.commitments[currency] as LiquidityProviderRates;

    // Инициализируем массив providerOrganization если его нет
    if (!currencyData.providerOrganization) {
      currencyData.providerOrganization = [];
    }

    // Нормализуем данные для поиска
    const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
    const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

    // Ищем существующую запись с таким же providerId и accountNumber
    // Важно: записи с пустыми id и accountNumber должны объединяться в одну
    const existingEntry = currencyData.providerOrganization.find(
      (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
    );

    if (existingEntry) {
      existingEntry.amount = _.round(existingEntry.amount + amount, 2);
      existingEntry.name = providerName; // Обновляем имя на случай, если оно изменилось
    } else {
      // Создаем новую запись
      const newEntry: LiquidityProviderOrganization = {
        name: providerName,
        id: normalizedProviderId,
        amount: _.round(amount, 2),
        accountNumber: normalizedAccountNumber,
      };
      currencyData.providerOrganization.push(newEntry);
    }

    // Пересчитываем amount для валюты (сумма по всем провайдерам)
    currencyData.amount = _.round(
      currencyData.providerOrganization.reduce((sum, org) => sum + (org.amount || 0), 0),
      2,
    );

    // Пересчитываем totalAmount с конвертацией всех валют в USD
    liquidityDoc.commitments.totalAmount = await this._calculateGlassTotalAmountInUSD(
      liquidityDoc.commitments,
      'commitments',
    );

    liquidityDoc.markModified('commitments');

    await liquidityDoc.save();
  }

  private _getRoomName(importTarget: AllCurrencies, exportTarget: AllCurrencies): string {
    return `${SocketMessageContext.LIQUIDITY_SHORT}:${importTarget}:${exportTarget}`;
  }

  private async _resolveAgentName(agentName?: string, agentId?: string): Promise<string | undefined> {
    if (agentName) {
      return agentName;
    }

    if (!agentId) {
      return undefined;
    }

    try {
      const agent = await this.client.send<IAgent>(AgentPattern.FIND_ONE_OR_EXCEPTION, {
        query: { _id: agentId },
      });

      return agent?.organizationName;
    } catch (error) {
      this.logger.warn(
        `Failed to get agent name for id ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private _extractAgentIdentifiers(agent?: string | IAgent): { agentId?: string; agentName?: string } {
    if (!agent) {
      return {};
    }

    if (typeof agent === 'string') {
      return { agentId: agent };
    }

    return {
      agentId: agent._id ? String(agent._id) : undefined,
      agentName: agent.organizationName,
    };
  }

  protected async makeQuery(findData: ILiquidityQuery) {
    const query: FilterQuery<Liquidity> = {};

    if (findData._id) {
      query._id = findData._id;
    }

    if (findData._ids?.length) {
      query._id = { $in: findData._ids };
    }

    return query;
  }
}
