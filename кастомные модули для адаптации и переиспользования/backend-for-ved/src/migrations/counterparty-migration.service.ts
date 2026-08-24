import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Counterparty } from 'modules/counterparty/service/counterparty.schema';
import { CounterpartyType, CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';
import { ICounterparty, ICounterpartyBank } from 'lib/interfaces/models/counterparty.interface';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';

export interface IFormPaymentForMigration {
  _id: string;
  account?: string;
  counterparty?: {
    name?: string;
    country?: string;
    inn?: string;
    swiftCode?: string;
    bankName?: string;
    bankCountry?: string;
    bankAddress?: string;
    accountNumber?: string;
  };
  status?: string;
  createDate?: Date;
  updateDate?: Date;
}

interface ICounterpartyGroupData {
  name: string;
  country: string;
  inn?: string;
  banks: IBankGroupData[];
  formPayments: IFormPaymentForMigration[];
}

interface IBankGroupData {
  bankName?: string;
  bankCountry?: string;
  bankAddress?: string;
  swiftCode?: string;
  accountNumber?: string;
  currency?: string;
}

@Injectable()
export class CounterpartyMigrationService {
  private readonly logger: Logger = new Logger(CounterpartyMigrationService.name);

  constructor(@InjectModel(Counterparty.name) private counterpartyModel: Model<Counterparty>) {}

  async runMigration(formPaymentModel: Model<any>): Promise<void> {
    this.logger.log('Starting counterparty migration...');

    const accountIds: string[] = await formPaymentModel.distinct('account', { account: { $exists: true, $ne: null } });
    this.logger.log(`Found ${accountIds.length} accounts with FormPayments`);

    const stats = { totalCounterpartiesCreated: 0, totalFormPaymentsLinked: 0 };

    for (const accountId of accountIds) {
      await this.migrateAccountCounterparties(formPaymentModel, accountId.toString(), stats);
    }

    this.logger.log(
      `Migration completed. Created: ${stats.totalCounterpartiesCreated} counterparties, Linked: ${stats.totalFormPaymentsLinked} FormPayments`,
    );
  }

  private async migrateAccountCounterparties(
    formPaymentModel: Model<any>,
    accountId: string,
    stats: { totalCounterpartiesCreated: number; totalFormPaymentsLinked: number },
  ): Promise<void> {
    const formPayments = await formPaymentModel.find({ account: accountId });

    if (formPayments.length === 0) {
      this.logger.debug(`Skipping account ${accountId}: no FormPayments`);
      return;
    }

    this.logger.log(`Processing ${formPayments.length} FormPayments for account: ${accountId}`);

    const counterpartiesMap = this.groupCounterpartiesByIdentifier(formPayments);

    for (const [identifier, counterpartyData] of counterpartiesMap) {
      const counterpartyType = this.determineCounterpartyType(counterpartyData);
      const existingCounterparty = await this.findExistingCounterparty(accountId, counterpartyType, counterpartyData);

      if (existingCounterparty) {
        await this.updateExistingCounterparty(existingCounterparty, counterpartyData, identifier, stats);
      } else {
        await this.createNewCounterparty(accountId, counterpartyData, stats);
      }
    }
  }

  private async findExistingCounterparty(
    accountId: string,
    counterpartyType: CounterpartyType,
    counterpartyData: { inn?: string; name: string; country: string },
  ): Promise<ICounterparty | null> {
    if (counterpartyType === CounterpartyType.RUSSIAN && counterpartyData.inn) {
      return this.counterpartyModel.findOne({
        createdBy: accountId,
        inn: counterpartyData.inn,
      });
    }

    return this.counterpartyModel.findOne({
      createdBy: accountId,
      name: counterpartyData.name,
      country: counterpartyData.country,
    });
  }

  private async updateExistingCounterparty(
    counterparty: ICounterparty,
    counterpartyData: ICounterpartyGroupData,
    identifier: string,
    stats: { totalCounterpartiesCreated: number; totalFormPaymentsLinked: number },
  ): Promise<void> {
    this.logger.debug(`Counterparty already exists: ${counterparty._id}, identifier: ${identifier}`);

    const formsLinked = await this.linkFormPaymentsToCounterparty(counterparty, counterpartyData.formPayments);
    stats.totalFormPaymentsLinked += formsLinked;

    await this.mergeCounterpartyBanks(counterparty, counterpartyData.banks);
    await this.counterpartyModel.updateOne(
      { _id: counterparty._id },
      {
        formPayments: counterparty.formPayments,
        banks: counterparty.banks,
      },
    );
  }

  private async linkFormPaymentsToCounterparty(
    counterparty: ICounterparty,
    formPayments: IFormPaymentForMigration[],
  ): Promise<number> {
    let linked = 0;

    for (const fp of formPayments) {
      if (!counterparty.formPayments.includes(fp._id)) {
        counterparty.formPayments.push(fp._id);
        linked++;
      }
    }

    return linked;
  }

  private async mergeCounterpartyBanks(counterparty: ICounterparty, banksToMerge: IBankGroupData[]): Promise<void> {
    for (const bankData of banksToMerge) {
      const existingBank = counterparty.banks.find((b) => {
        if (b.swiftCode && bankData.swiftCode) {
          return b.swiftCode === bankData.swiftCode;
        }
        return b.bankName === bankData.bankName && b.bankCountry === bankData.bankCountry;
      });

      if (!existingBank) {
        const newBank = this.buildNewBank(bankData);
        counterparty.banks.push(newBank);
        this.logger.debug(`Bank merged into counterparty: ${counterparty._id}, bank: ${newBank.bankName}`);
      } else if (bankData.accountNumber) {
        await this.mergeAccountToBank(existingBank, bankData);
      }
    }
  }

  private buildNewBank(bankData: IBankGroupData): ICounterpartyBank {
    return {
      uuid: uuidv4(),
      bankName: bankData.bankName,
      bankCountry: bankData.bankCountry,
      bankAddress: bankData.bankAddress,
      swiftCode: bankData.swiftCode,
      accounts: [
        {
          uuid: uuidv4(),
          accountNumber: bankData.accountNumber || '',
          currency: bankData.currency || 'USD',
          isPrimary: true,
        },
      ],
    };
  }

  private async mergeAccountToBank(existingBank: ICounterpartyBank, bankData: IBankGroupData): Promise<void> {
    const accountExists = existingBank.accounts.some((acc) => acc.accountNumber === bankData.accountNumber);

    if (!accountExists) {
      existingBank.accounts.push({
        uuid: uuidv4(),
        accountNumber: bankData.accountNumber || '',
        currency: bankData.currency || 'USD',
        isPrimary: existingBank.accounts.length === 0,
      });
      this.logger.debug(
        `Account merged into existing bank: ${existingBank.bankName}, account: ${bankData.accountNumber}`,
      );
    }
  }

  private async createNewCounterparty(
    accountId: string,
    counterpartyData: ICounterpartyGroupData,
    stats: { totalCounterpartiesCreated: number; totalFormPaymentsLinked: number },
  ): Promise<void> {
    const banks = counterpartyData.banks.map((bankData) => this.buildNewBank(bankData));

    const savedCounterparty = await this.counterpartyModel.create({
      createdBy: accountId,
      name: counterpartyData.name,
      country: counterpartyData.country,
      type: this.determineCounterpartyType(counterpartyData),
      inn: counterpartyData.inn,
      banks,
      formPayments: counterpartyData.formPayments.map((fp) => fp._id),
      lastApprovalStatus: this.getLastApprovalStatus(counterpartyData.formPayments),
      lastApprovalDate: this.getLastApprovalDate(counterpartyData.formPayments),
      isActive: true,
    });
    stats.totalCounterpartiesCreated++;
    stats.totalFormPaymentsLinked += counterpartyData.formPayments.length;

    this.logger.log(
      `Counterparty created: ${savedCounterparty._id}, name: ${counterpartyData.name}, owner: ${accountId}`,
    );
  }

  private groupCounterpartiesByIdentifier(
    formPayments: IFormPaymentForMigration[],
  ): Map<string, ICounterpartyGroupData> {
    const map = new Map<string, ICounterpartyGroupData>();

    for (const fp of formPayments) {
      if (!fp.counterparty?.name || !fp.counterparty?.country) {
        continue;
      }

      const identifier = this.getCounterpartyIdentifier(fp.counterparty);
      this.addFormPaymentToGroup(map, identifier, fp);
    }

    return map;
  }

  private getCounterpartyIdentifier(counterparty: { inn?: string; name?: string; country?: string }): string {
    if (counterparty.inn) {
      return `inn:${counterparty.inn}`;
    }
    return `name:${counterparty.name}:${counterparty.country}`;
  }

  private addFormPaymentToGroup(
    map: Map<string, ICounterpartyGroupData>,
    identifier: string,
    fp: IFormPaymentForMigration,
  ): void {
    if (!map.has(identifier)) {
      map.set(identifier, {
        name: fp.counterparty?.name || '',
        country: fp.counterparty?.country || '',
        inn: fp.counterparty?.inn,
        banks: [],
        formPayments: [],
      });
    }

    const counterpartyData = map.get(identifier);
    if (counterpartyData) {
      counterpartyData.formPayments.push(fp);

      if (fp.counterparty?.bankName) {
        this.mergeBankToGroup(counterpartyData, fp.counterparty);
      }
    }
  }

  private mergeBankToGroup(
    counterpartyData: ICounterpartyGroupData,
    counterpartyDetails: {
      bankName?: string;
      bankCountry?: string;
      bankAddress?: string;
      swiftCode?: string;
      accountNumber?: string;
    },
  ): void {
    const bankKey = this.getBankKey(counterpartyDetails);
    const existingBank = counterpartyData.banks.find((b) => this.getBankKey(b) === bankKey);

    if (!existingBank) {
      counterpartyData.banks.push({
        bankName: counterpartyDetails.bankName,
        bankCountry: counterpartyDetails.bankCountry,
        bankAddress: counterpartyDetails.bankAddress,
        swiftCode: counterpartyDetails.swiftCode,
        accountNumber: counterpartyDetails.accountNumber,
      });
    }
  }

  private getBankKey(bankDetails: {
    swiftCode?: string;
    bankName?: string;
    bankCountry?: string;
    bankAddress?: string;
  }): string {
    if (bankDetails.swiftCode) {
      return `swift:${bankDetails.swiftCode}`;
    }
    return `name:${bankDetails.bankName}:${bankDetails.bankCountry}:${bankDetails.bankAddress || ''}`;
  }

  private determineCounterpartyType(counterpartyData: { inn?: string; country?: string }): CounterpartyType {
    if (counterpartyData.inn) {
      return CounterpartyType.RUSSIAN;
    }
    return CounterpartyType.FOREIGN;
  }

  private getLastApprovalStatus(formPayments: IFormPaymentForMigration[]): CounterpartyApprovalStatus | null {
    // Assume approved if we're migrating from old FormPayments
    // This would need to be enhanced to read actual approval status if available
    const hasApprovedForms = formPayments.some((fp) => fp.status === 'approved' || fp.status === 'form_accepted');
    return hasApprovedForms ? CounterpartyApprovalStatus.APPROVED : CounterpartyApprovalStatus.PENDING;
  }

  private getLastApprovalDate(formPayments: IFormPaymentForMigration[]): Date | null {
    if (formPayments.length === 0) {
      return null;
    }

    const approvedFPs = formPayments.filter(
      (fp) => fp.status === FormPaymentStatus.FORM_ACCEPTED || fp.status === FormPaymentStatus.COMPLETED,
    );

    if (approvedFPs.length === 0) {
      return null;
    }

    const sortedFPs = [...approvedFPs].sort((a, b) => {
      const dateA = a.updateDate ?? a.createDate ? new Date(a.updateDate ?? a.createDate!).getTime() : 0;
      const dateB = b.updateDate ?? b.createDate ? new Date(b.updateDate ?? b.createDate!).getTime() : 0;
      return dateB - dateA;
    });

    return (sortedFPs[0]?.updateDate ?? sortedFPs[0]?.createDate) || null;
  }
}
