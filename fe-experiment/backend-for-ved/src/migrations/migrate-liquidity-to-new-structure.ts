/* eslint-disable no-console */
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { FormPaymentStatus, FormPaymentDirection, FormPaymentCondition } from '../lib/enums/models/form-payment.enums';
import { AllCurrencies } from '../lib/enums/common.enums';
import * as _ from 'lodash';
import { Types } from 'mongoose';
import {
  LiquidityExportRates,
  LiquidityCommitmentsRates,
  LiquidityProviderRates,
  LiquidityImportRates,
  LiquidityAgentRates,
} from '../lib/interfaces/models/liquidity.interface';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';
import { IAgent } from '../lib/interfaces/models/agent.interface';
import { IOrganizationRequisites } from '../lib/interfaces/models/organization.interface';

interface IOrganizationDocument {
  _id: Types.ObjectId | string;
  name: string;
  requisites?: IOrganizationRequisites[];
}

type IAgentDocument = IAgent & { _id: Types.ObjectId | string };

function isValidCurrency(currency: string | undefined): currency is AllCurrencies {
  return currency !== undefined && Object.values(AllCurrencies).includes(currency as AllCurrencies);
}

export class MigrateLiquidityToNewStructure extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up(): Promise<void> {
    console.log('Starting: Migrate liquidity to new structure with providerOrganization array');

    type FormPaymentDocument = IFormPayment;
    const extractProviderId = (provider: FormPaymentDocument['providerOrganization']): string | undefined => {
      if (!provider) return undefined;
      if (typeof provider === 'string') return provider;
      return provider.refOrganizationId || (provider._id ? String(provider._id) : undefined);
    };

    const extractProviderName = (provider: FormPaymentDocument['providerOrganization']): string | undefined => {
      if (!provider || typeof provider === 'string') return undefined;
      return provider.name;
    };

    const extractAccountNumber = (provider: FormPaymentDocument['providerOrganization']): string | undefined => {
      if (!provider || typeof provider === 'string') return undefined;
      if (!provider.requisite) return undefined;
      const requisite = provider.requisite;
      if (Array.isArray(requisite) && requisite.length > 0) {
        return requisite[0].accountNumber;
      } else if (typeof requisite === 'object' && 'accountNumber' in requisite) {
        return requisite.accountNumber;
      }
      return undefined;
    };

    const FormPaymentModel = this.connection.model<FormPaymentDocument>('FormPayment');
    const OrganizationModel = this.connection.model<IOrganizationDocument>('Organization');
    const AgentModel = this.connection.model<IAgentDocument>('Agent');

    // Создаем карту организаций для быстрого поиска
    const organizationsMap = new Map<string, string>();
    const organizations = await OrganizationModel.find({}).select('_id name').lean();
    organizations.forEach((org) => {
      organizationsMap.set(String(org._id), org.name);
    });

    // Создаем карту агентов для быстрого поиска
    const agentsMap = new Map<string, string>();
    const agents = await AgentModel.find({}).select('_id organizationName').lean();
    agents.forEach((agent) => {
      agentsMap.set(String(agent._id), agent.organizationName);
    });

    // Инициализируем структуры
    const exportData: LiquidityExportRates = { totalAmount: 0 };
    const importData: LiquidityImportRates = { totalAmount: 0 };
    const commitmentsData: LiquidityCommitmentsRates = { totalAmount: 0 };

    // Инициализируем все валюты
    Object.values(AllCurrencies).forEach((currency) => {
      exportData[currency] = { amount: 0, providerOrganization: [] };
      importData[currency] = { amount: 0 };
      commitmentsData[currency] = { amount: 0, providerOrganization: [] };
    });

    console.log('Processing form payments for export glass...');

    // ЭКСПОРТ: Пополнение при PAYMENT_RECEIVED от контрагента
    const exportPayments = await FormPaymentModel.find({
      direction: FormPaymentDirection.EXPORT,
      status: FormPaymentStatus.PAYMENT_RECEIVED,
    })
      .select('currency totals providerOrganization')
      .lean();

    console.log(`Found ${exportPayments.length} export payments with PAYMENT_RECEIVED status`);

    for (const payment of exportPayments) {
      const currency = payment.currency?.counterparty;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.amount || 0;
      const providerId = extractProviderId(payment.providerOrganization);
      let providerName = extractProviderName(payment.providerOrganization);
      const accountNumber = extractAccountNumber(payment.providerOrganization) || '';

      // Если имя не найдено, ищем в карте организаций
      if (!providerName && providerId) {
        providerName = organizationsMap.get(providerId) || 'Unknown Provider';
      } else if (!providerName) {
        providerName = 'Unknown Provider';
      }

      // Нормализуем данные для поиска (пустые строки для неизвестных)
      const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
      const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

      const currencyData = exportData[currency] as LiquidityProviderRates;
      const existingEntry = currencyData.providerOrganization.find(
        (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
      );

      if (existingEntry) {
        existingEntry.amount = _.round(existingEntry.amount + amount, 2);
        existingEntry.name = providerName; // Обновляем имя
      } else {
        currencyData.providerOrganization.push({
          name: providerName,
          id: normalizedProviderId,
          amount: _.round(amount, 2),
          accountNumber: normalizedAccountNumber,
        });
      }
    }

    // Также добавляем возвраты PAYMENT_REFUND_SENT для экспорта
    const refundPayments = await FormPaymentModel.find({
      direction: FormPaymentDirection.EXPORT,
      status: FormPaymentStatus.PAYMENT_REFUND_SENT,
    })
      .select('currency totals providerOrganization')
      .lean();

    console.log(`Found ${refundPayments.length} export payments with PAYMENT_REFUND_SENT status`);

    for (const payment of refundPayments) {
      const currency = payment.currency?.counterparty;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.amount || 0;
      const providerId = extractProviderId(payment.providerOrganization);
      let providerName = extractProviderName(payment.providerOrganization);
      const accountNumber = extractAccountNumber(payment.providerOrganization) || '';

      if (!providerName && providerId) {
        providerName = organizationsMap.get(providerId) || 'Unknown Provider';
      } else if (!providerName) {
        providerName = 'Unknown Provider';
      }

      // Нормализуем данные для поиска (пустые строки для неизвестных)
      const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
      const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

      const currencyData = exportData[currency] as LiquidityProviderRates;
      const existingEntry = currencyData.providerOrganization.find(
        (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
      );

      if (existingEntry) {
        existingEntry.amount = _.round(existingEntry.amount + amount, 2);
        existingEntry.name = providerName; // Обновляем имя
      } else {
        currencyData.providerOrganization.push({
          name: providerName,
          id: normalizedProviderId,
          amount: _.round(amount, 2),
          accountNumber: normalizedAccountNumber,
        });
      }
    }

    console.log('Processing form payments for import glass...');

    // ИМПОРТ: Пополнение при PAYMENT_RECEIVED в рублях
    const importPayments = await FormPaymentModel.find({
      direction: FormPaymentDirection.IMPORT,
      'currency.client': AllCurrencies.RUB,
      status: FormPaymentStatus.PAYMENT_RECEIVED,
    })
      .select('currency totals agent')
      .lean();

    console.log(`Found ${importPayments.length} import payments with PAYMENT_RECEIVED status (RUB)`);

    for (const payment of importPayments) {
      const currency = payment.currency?.client;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.coverAmount || 0;
      const agentId = typeof payment.agent === 'string' ? payment.agent : payment.agent?._id;
      let agentName =
        typeof payment.agent === 'object' && payment.agent?.organizationName
          ? payment.agent.organizationName
          : undefined;

      if (!agentName && agentId) {
        agentName = agentsMap.get(String(agentId)) || 'Unknown Agent';
      } else if (!agentName) {
        agentName = 'Unknown Agent';
      }

      const currencyData = importData[currency] as LiquidityAgentRates;
      if (!currencyData[agentName]) {
        currencyData[agentName] = 0;
      }
      currencyData[agentName] = _.round((currencyData[agentName] || 0) + amount, 2);
    }

    console.log('Processing form payments for commitments glass...');

    // COMMITMENTS: Различные правила для импорта и экспорта

    // 1. Авансовая импортная сделка в SIGNING_ORDER_ACCEPTED
    const advanceImportPayments = await FormPaymentModel.find({
      direction: FormPaymentDirection.IMPORT,
      platformPaymentCondition: FormPaymentCondition.ADVANCE,
      status: FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    })
      .select('currency totals providerOrganization')
      .lean();

    console.log(`Found ${advanceImportPayments.length} advance import payments in SIGNING_ORDER_ACCEPTED`);

    for (const payment of advanceImportPayments) {
      const currency = payment.currency?.client;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.amount || 0;
      const providerId = extractProviderId(payment.providerOrganization);
      let providerName = extractProviderName(payment.providerOrganization);
      const accountNumber = extractAccountNumber(payment.providerOrganization) || '';

      if (!providerName && providerId) {
        providerName = organizationsMap.get(providerId) || 'Unknown Provider';
      } else if (!providerName) {
        providerName = 'Unknown Provider';
      }

      // Нормализуем данные для поиска (пустые строки для неизвестных)
      const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
      const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

      const currencyData = commitmentsData[currency] as LiquidityProviderRates;
      const existingEntry = currencyData.providerOrganization.find(
        (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
      );

      if (existingEntry) {
        existingEntry.amount = _.round(existingEntry.amount + amount, 2);
        existingEntry.name = providerName; // Обновляем имя
      } else {
        currencyData.providerOrganization.push({
          name: providerName,
          id: normalizedProviderId,
          amount: _.round(amount, 2),
          accountNumber: normalizedAccountNumber,
        });
      }
    }

    // 2. Постоплатная сделка (импорт и экспорт) в ADVANCE_SIGNING_ORDER_ACCEPTED
    const postPaymentPayments = await FormPaymentModel.find({
      platformPaymentCondition: FormPaymentCondition.POST_PAYMENT,
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    })
      .select('currency totals direction providerOrganization')
      .lean();

    console.log(`Found ${postPaymentPayments.length} post-payment payments in ADVANCE_SIGNING_ORDER_ACCEPTED`);

    for (const payment of postPaymentPayments) {
      const currency =
        payment.direction === FormPaymentDirection.EXPORT ? payment.currency?.counterparty : payment.currency?.client;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.amount || 0;
      const providerId = extractProviderId(payment.providerOrganization);
      let providerName = extractProviderName(payment.providerOrganization);
      const accountNumber = extractAccountNumber(payment.providerOrganization) || '';

      if (!providerName && providerId) {
        providerName = organizationsMap.get(providerId) || 'Unknown Provider';
      } else if (!providerName) {
        providerName = 'Unknown Provider';
      }

      // Нормализуем данные для поиска (пустые строки для неизвестных)
      const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
      const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

      const currencyData = commitmentsData[currency] as LiquidityProviderRates;
      const existingEntry = currencyData.providerOrganization.find(
        (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
      );

      if (existingEntry) {
        existingEntry.amount = _.round(existingEntry.amount + amount, 2);
        existingEntry.name = providerName; // Обновляем имя
      } else {
        currencyData.providerOrganization.push({
          name: providerName,
          id: normalizedProviderId,
          amount: _.round(amount, 2),
          accountNumber: normalizedAccountNumber,
        });
      }
    }

    // 3. Экспортная сделка в PAYMENT_REFUND_SENT (уже добавлено выше в export, нужно добавить и в commitments)
    for (const payment of refundPayments) {
      const currency = payment.currency?.counterparty;
      if (!isValidCurrency(currency)) continue;

      const amount = payment.totals?.amount || 0;
      const providerId = extractProviderId(payment.providerOrganization);
      let providerName = extractProviderName(payment.providerOrganization);
      const accountNumber = extractAccountNumber(payment.providerOrganization) || '';

      if (!providerName && providerId) {
        providerName = organizationsMap.get(providerId) || 'Unknown Provider';
      } else if (!providerName) {
        providerName = 'Unknown Provider';
      }

      // Нормализуем данные для поиска (пустые строки для неизвестных)
      const normalizedProviderId = providerId && providerId.trim() !== '' ? providerId.trim() : '';
      const normalizedAccountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : '';

      const currencyData = commitmentsData[currency] as LiquidityProviderRates;
      const existingEntry = currencyData.providerOrganization.find(
        (org) => org.id === normalizedProviderId && org.accountNumber === normalizedAccountNumber,
      );

      if (existingEntry) {
        existingEntry.amount = _.round(existingEntry.amount + amount, 2);
        existingEntry.name = providerName; // Обновляем имя
      } else {
        currencyData.providerOrganization.push({
          name: providerName,
          id: normalizedProviderId,
          amount: _.round(amount, 2),
          accountNumber: normalizedAccountNumber,
        });
      }
    }

    // Пересчитываем суммы для каждой валюты и totalAmount
    console.log('Recalculating totals...');

    Object.values(AllCurrencies).forEach((currency) => {
      // Export
      const exportCurrency = exportData[currency] as LiquidityProviderRates;
      exportCurrency.amount = _.round(
        exportCurrency.providerOrganization.reduce((sum, org) => sum + org.amount, 0),
        2,
      );

      // Import
      const importCurrency = importData[currency] as LiquidityAgentRates;
      importCurrency.amount = _.round(
        Object.keys(importCurrency)
          .filter((key) => key !== 'amount')
          .reduce((sum, key) => sum + (importCurrency[key] || 0), 0),
        2,
      );

      // Commitments
      const commitmentsCurrency = commitmentsData[currency] as LiquidityProviderRates;
      commitmentsCurrency.amount = _.round(
        commitmentsCurrency.providerOrganization.reduce((sum, org) => sum + org.amount, 0),
        2,
      );
    });

    // Пересчитываем totalAmount
    exportData.totalAmount = _.round(
      Object.values(AllCurrencies).reduce((sum, currency) => {
        const currencyData = exportData[currency] as LiquidityProviderRates;
        return sum + currencyData.amount;
      }, 0),
      2,
    );

    importData.totalAmount = _.round(
      Object.values(AllCurrencies).reduce((sum, currency) => {
        const currencyData = importData[currency] as LiquidityAgentRates;
        return sum + currencyData.amount;
      }, 0),
      2,
    );

    commitmentsData.totalAmount = _.round(
      Object.values(AllCurrencies).reduce((sum, currency) => {
        const currencyData = commitmentsData[currency] as LiquidityProviderRates;
        return sum + currencyData.amount;
      }, 0),
      2,
    );

    console.log('Export totalAmount:', exportData.totalAmount);
    console.log('Import totalAmount:', importData.totalAmount);
    console.log('Commitments totalAmount:', commitmentsData.totalAmount);

    // Обновляем liquidity в БД
    const LiquidityModel = this.connection.model('Liquidity');
    const liquidity = await LiquidityModel.findOne({});

    if (liquidity) {
      liquidity.export = exportData;
      liquidity.import = importData;
      liquidity.commitments = commitmentsData;

      // Отмечаем поля как измененные (для Mixed типов)
      liquidity.markModified('export');
      liquidity.markModified('import');
      liquidity.markModified('commitments');

      await liquidity.save();
      console.log('✓ Liquidity updated successfully with new structure');
    } else {
      await LiquidityModel.create({
        export: exportData,
        import: importData,
        commitments: commitmentsData,
      });
      console.log('✓ Liquidity created successfully with new structure');
    }

    console.log('Completed: Migrate liquidity to new structure');
  }

  async down(): Promise<void> {
    console.log('Down migration not implemented - liquidity will need to be recalculated manually if needed');
  }
}
