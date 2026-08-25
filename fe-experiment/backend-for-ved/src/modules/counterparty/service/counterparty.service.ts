import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PaginateModel, Types, UpdateQuery } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from 'lib/services/base/base.service';
import { Counterparty } from './counterparty.schema';
import {
  ICounterparty,
  ICounterpartyBank,
  ICounterpartyBankAccount,
} from 'lib/interfaces/models/counterparty.interface';
import {
  ICounterpartyService,
  ICounterpartyQuery,
  ICounterpartyCreateDto,
  ICounterpartyUpdateDto,
  ICounterpartyApprovalUpdate,
  ICounterpartyRequestsFilters,
  ICounterpartyBankInput,
  ICounterpartyComplianceStatistics,
  ICounterpartyWithStatistics,
} from './counterparty.service.interface';
import { CounterpartyApprovalStatus, CounterpartyType } from 'lib/enums/models/counterparty.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { CounterpartyRequestsDto } from '../dto/counterparty-requests.dto';
import { CounterpartyRequestHelper } from './counterparty-request.helper';
import {
  EXTERNAL_APPROVED_STAGES,
  EXTERNAL_CANCELED_STATUSES,
  EXTERNAL_PENDING_STATUSES,
  EXTERNAL_REJECTED_STATUSES,
} from '../../compliance-history/compliance-history.constants';
import _ from 'lodash';

interface IBankDetailsInput {
  name?: string;
  country?: string;
  bankCountry?: string;
  inn?: string;
  address?: string;
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  accountNumber?: string;
  currency?: string;
}

interface QueryConditions {
  createdBy: string;
  isActive: boolean;
  inn?: string;
  name?: string;
  country?: string;
}

// Constants - No magic strings or hardcoded values
const RUSSIA_COUNTRY_CODES = ['RU', 'russia', 'Russia', 'Russian Federation', 'Россия'];
const DEFAULT_CURRENCY = 'USD';
const APPROVAL_EXPIRY_DAYS = 180; // 6 months = 180 days
const DAYS_PER_MONTH = 30; // Approximate days per month for display calculations
const EMPTY_COMPLIANCE_STATS: ICounterpartyComplianceStatistics = { pending: 0, approved: 0, rejected: 0 };

@Injectable()
export class CounterpartyService
  extends BaseService<
    ICounterparty,
    Counterparty,
    ICounterpartyQuery,
    IBaseOptions,
    ICounterpartyCreateDto,
    ICounterpartyUpdateDto
  >
  implements ICounterpartyService
{
  private readonly logger: Logger = new Logger(CounterpartyService.name);
  private readonly requestsHelper: CounterpartyRequestHelper;

  constructor(
    @InjectModel(Counterparty.name) readonly model: PaginateModel<Counterparty>,
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
  ) {
    super();
    this.requestsHelper = new CounterpartyRequestHelper(this.formPaymentModel);
  }

  private isComplianceAccount(account?: { role?: AccountRole; roles?: AccountRole[] }): boolean {
    return (
      account?.role === AccountRole.COMPLIANCE_OFFICER ||
      account?.role === AccountRole.INTERNAL_COMPLIANCE_OFFICER ||
      account?.role === AccountRole.ROOT ||
      account?.roles?.includes(AccountRole.COMPLIANCE_OFFICER) ||
      account?.roles?.includes(AccountRole.INTERNAL_COMPLIANCE_OFFICER) ||
      account?.roles?.includes(AccountRole.ROOT)
    );
  }

  private getCreatedById(counterparty: ICounterparty): string {
    return typeof counterparty.createdBy === 'string'
      ? counterparty.createdBy
      : (counterparty.createdBy as any)?._id?.toString?.() || String(counterparty.createdBy);
  }

  private getCounterpartyId(counterparty: ICounterparty): string {
    if (typeof counterparty._id === 'string') {
      return counterparty._id;
    }
    return (counterparty._id as any)?.toString?.() || String(counterparty._id);
  }

  private createEmptyStatistics(): ICounterpartyComplianceStatistics {
    return { ...EMPTY_COMPLIANCE_STATS };
  }

  private async getCounterpartyStatisticsMap(
    counterpartyIds: string[],
  ): Promise<Record<string, ICounterpartyComplianceStatistics>> {
    if (!counterpartyIds?.length) {
      return {};
    }

    const uniqueIds = Array.from(new Set(counterpartyIds.filter(Boolean)));
    const objectIds = uniqueIds
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch (error) {
          this.logger.warn(`Invalid counterparty id for statistics calculation: ${id}`);
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => Boolean(id));

    if (!objectIds.length) {
      return {};
    }

    const stats = await this.formPaymentModel.aggregate([
      {
        $match: {
          counterpartyRef: { $in: objectIds },
        },
      },
      {
        $group: {
          _id: '$counterpartyRef',
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_PENDING_STATUSES] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$stage', EXTERNAL_APPROVED_STAGES] },
                    { $not: [{ $in: ['$status', EXTERNAL_CANCELED_STATUSES] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_REJECTED_STATUSES] }, 1, 0],
            },
          },
        },
      },
    ]);

    return stats.reduce<Record<string, ICounterpartyComplianceStatistics>>((acc, item) => {
      const id = item?._id?.toString?.();
      if (!id) {
        return acc;
      }
      acc[id] = {
        pending: item?.pending || 0,
        approved: item?.approved || 0,
        rejected: item?.rejected || 0,
      };
      return acc;
    }, {});
  }

  private async enrichCounterpartiesWithStatistics(
    counterparties: ICounterparty[],
    existingStatsMap?: Record<string, ICounterpartyComplianceStatistics>,
  ): Promise<ICounterpartyWithStatistics[]> {
    if (!counterparties?.length) {
      return [];
    }

    const counterpartyIds = counterparties.map((counterparty) => this.getCounterpartyId(counterparty));
    const statsMap = existingStatsMap ?? (await this.getCounterpartyStatisticsMap(counterpartyIds));

    return counterparties.map((counterparty) => {
      const id = this.getCounterpartyId(counterparty);
      return {
        ...counterparty,
        statistics: statsMap[id] || this.createEmptyStatistics(),
      };
    });
  }

  async updateByRequester(
    id: string,
    account: { _id?: string; role?: AccountRole; roles?: AccountRole[] } | undefined,
    updateDto: ICounterpartyUpdateDto,
  ): Promise<ICounterparty> {
    const accountId = account?._id;
    if (!accountId) {
      throw new BadRequestException('Account not found in request');
    }

    // Compliance path: only status update (status+optional comment); system sets date/by
    if (this.isComplianceAccount(account)) {
      if (!updateDto.lastApprovalStatus && updateDto.lastApprovalComment === undefined) {
        throw new BadRequestException('Provide lastApprovalStatus (optional lastApprovalComment) to update status');
      }
      if (!updateDto.lastApprovalStatus) {
        throw new BadRequestException('lastApprovalStatus is required for status update');
      }
      this.logger.log(
        `Compliance status update: counterparty=${id}, by=${accountId}, status=${updateDto.lastApprovalStatus}`,
      );
      return this.updateApprovalStatus(id, {
        lastApprovalStatus: updateDto.lastApprovalStatus,
        lastApprovalDate: new Date(),
        lastApprovedBy: accountId,
        lastApprovalComment: updateDto.lastApprovalComment,
      });
    }

    // Non-compliance: forbid any approval fields
    if (
      updateDto.lastApprovalStatus !== undefined ||
      updateDto.lastApprovalDate !== undefined ||
      updateDto.lastApprovedBy !== undefined ||
      updateDto.lastApprovalComment !== undefined
    ) {
      this.logger.warn(`Forbidden status change attempt by non-compliance: counterparty=${id}, by=${accountId}`);
      throw new ForbiddenException('Only compliance officer can change approval status');
    }

    // Validate ownership
    const cp = await this.findById(id);
    if (!cp) {
      throw new NotFoundException('Counterparty not found');
    }
    const ownerId = this.getCreatedById(cp);
    if (ownerId !== accountId) {
      this.logger.warn(`Access denied: counterparty belongs to ${ownerId}, accessed by ${accountId}`);
      throw new ForbiddenException('Only the owner can update counterparty data');
    }

    this.logger.log(`Updating counterparty: ${id}, account: ${accountId}`);
    return this.update(id, updateDto);
  }

  async findById(id: string): Promise<ICounterparty | null> {
    return super.findOne(
      { _id: id, isActive: true },
      {
        include: ['lastApprovedBy', 'formPayments', 'statusHistory.createdBy'],
      },
    );
  }

  async findAll(query?: Partial<ICounterpartyQuery>): Promise<IPaginateResult<ICounterparty>> {
    const { page, limit, ...filterData } = query || {};

    const filter: FilterQuery<Counterparty> = {
      isActive: true,
      ...filterData,
    };

    return super.find(filter as ICounterpartyQuery, {
      page: page || 1,
      limit: limit || 20,
      sort: { createDate: -1 },
      include: ['createdBy', 'lastApprovedBy', 'statusHistory.createdBy'],
    });
  }

  async findByAccount(accountId: string, query?: Partial<ICounterpartyQuery>): Promise<IPaginateResult<ICounterparty>> {
    const { page, limit, ...filterData } = query || {};

    const filter: FilterQuery<Counterparty> = {
      createdBy: accountId,
      isActive: true,
      ...filterData,
    };

    return super.find(filter as ICounterpartyQuery, {
      page: page || 1,
      limit: limit || 20,
      sort: { createDate: -1 },
      include: ['createdBy', 'lastApprovedBy', 'statusHistory.createdBy'],
    });
  }

  async listForAccount(
    account: { _id?: string; role?: AccountRole; roles?: AccountRole[] } | undefined,
    query?: Partial<ICounterpartyQuery>,
  ): Promise<IPaginateResult<ICounterpartyWithStatistics> & { statistics: ICounterpartyComplianceStatistics }> {
    const isCompliance = this.isComplianceAccount(account);
    const safeQuery: Partial<ICounterpartyQuery> = query ?? {};
    const filterData = _.omit(safeQuery, ['page', 'limit']);

    let list: IPaginateResult<ICounterparty>;
    let visibilityQuery: ICounterpartyQuery;

    if (isCompliance) {
      visibilityQuery = {
        isActive: true,
        ...filterData,
      };
      list = await this.findAll(query);
    } else {
      const accountId = account?._id;
      if (!accountId) {
        throw new UnauthorizedException('Account not found in request');
      }

      visibilityQuery = {
        createdBy: accountId,
        isActive: true,
        ...filterData,
      };

      list = await this.findByAccount(accountId, query);
    }

    // Collect all visible counterparty ids (ignoring pagination)
    const { _ids } = await super.findIds(visibilityQuery);
    const visibleIds = (_ids || []).map((id) => id.toString());

    let statsMapForVisible: Record<string, ICounterpartyComplianceStatistics> = {};
    let aggregatedStatistics = this.createEmptyStatistics();

    if (visibleIds.length) {
      statsMapForVisible = await this.getCounterpartyStatisticsMap(visibleIds);

      aggregatedStatistics = Object.values(statsMapForVisible).reduce<ICounterpartyComplianceStatistics>(
        (acc, stats) => {
          acc.pending += stats.pending;
          acc.approved += stats.approved;
          acc.rejected += stats.rejected;
          return acc;
        },
        this.createEmptyStatistics(),
      );
    }

    const docsWithStatistics = await this.enrichCounterpartiesWithStatistics(list.docs || [], statsMapForVisible);

    return { ...list, docs: docsWithStatistics, statistics: aggregatedStatistics };
  }

  async create(data: ICounterpartyCreateDto): Promise<ICounterparty> {
    this.validateCounterpartyData(data);

    // If counterparty with same identifiers exists:
    // - active  → keep current behavior (throw duplicate error)
    // - inactive → treat as restore and just reactivate it
    const existingCounterparty = await this.findDuplicate(data, true);

    if (existingCounterparty) {
      if (existingCounterparty.isActive) {
        await this.ensureCounterpartyIsUnique(data);
      } else {
        const reactivated = await this.model
          .findOneAndUpdate({ _id: existingCounterparty._id }, { $set: { isActive: true } }, { new: true })
          .exec();

        if (!reactivated) {
          throw new NotFoundException('Counterparty not found during reactivation');
        }

        this.logger.log(
          `Counterparty reactivated: ${reactivated._id}, name: ${reactivated.name}, owner: ${reactivated.createdBy}`,
        );

        return reactivated;
      }
    }

    await this.ensureCounterpartyIsUnique(data);

    const createPayload = this.buildCreatePayload(data);
    const counterparty = await super.create(createPayload);

    this.logger.log(`Counterparty created: ${counterparty._id}, name: ${data.name}, owner: ${data.createdBy}`);

    return counterparty;
  }

  async update(id: string, data: ICounterpartyUpdateDto): Promise<ICounterparty> {
    const counterparty = await super.findOneOrException({ _id: id });

    this.validateUpdateData(data, counterparty);

    const updateFields: Partial<ICounterpartyUpdateDto> = { ...data };
    const mongoUpdate: UpdateQuery<Counterparty> = {};

    // Handle bank addition/removal
    if (data.addBanks && data.addBanks.length > 0) {
      const newBanks = data.addBanks.map((bank) => ({
        ...bank,
        uuid: uuidv4(),
        accounts: bank.accounts.map((account) => ({
          ...account,
          uuid: uuidv4(),
        })),
      }));
      mongoUpdate.$push = { banks: { $each: newBanks } };
    }

    if (data.removeBankUuids && data.removeBankUuids.length > 0) {
      mongoUpdate.$pull = { banks: { uuid: { $in: data.removeBankUuids } } };
    }

    // If approval status is changing, add to history
    if (data.lastApprovalStatus && data.lastApprovalStatus !== counterparty.lastApprovalStatus) {
      const historyEvent = {
        status: data.lastApprovalStatus,
        createDate: data.lastApprovalDate || new Date(),
        createdBy: data.lastApprovedBy,
        comment: data.lastApprovalComment,
      };

      if (!mongoUpdate.$push) {
        mongoUpdate.$push = {};
      }
      mongoUpdate.$push.statusHistory = historyEvent;

      this.logger.log(
        `Approval status change detected: ${counterparty.lastApprovalStatus} → ${data.lastApprovalStatus}, adding to history`,
      );
    }

    // Add other fields to update
    const otherFields: Partial<ICounterpartyUpdateDto> = { ...updateFields };
    delete otherFields.addBanks;
    delete otherFields.removeBankUuids;
    if (Object.keys(otherFields).length > 0) {
      mongoUpdate.$set = otherFields;
    }

    const updated = await this.model.findOneAndUpdate({ _id: id }, mongoUpdate, { new: true });

    if (!updated) {
      throw new NotFoundException('Counterparty not found during update');
    }

    this.logger.log(`Counterparty updated: ${id}, owner: ${counterparty.createdBy}`);

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { isActive: false } }).exec();
    this.logger.log(`Counterparty soft deleted: ${id}`);
  }

  async addAccountToBank(
    counterpartyId: string,
    bankUuid: string,
    accountData: { accountNumber: string; currency: string; isPrimary?: boolean },
  ): Promise<ICounterparty> {
    const counterparty = await this.findById(counterpartyId);
    if (!counterparty) {
      throw new NotFoundException('Counterparty not found');
    }

    const bank = counterparty.banks.find((b) => b.uuid === bankUuid);

    if (!bank) {
      this.logger.warn(`Bank not found: counterparty=${counterpartyId}, bank=${bankUuid}`);
      throw new Error('Bank not found');
    }

    const accountExists = bank.accounts.some((acc) => acc.accountNumber === accountData.accountNumber);
    if (accountExists) {
      this.logger.warn(`Account already exists: ${accountData.accountNumber}`);
      throw new Error('Account already exists in this bank');
    }

    const updatedBanks = counterparty.banks.map((b) => {
      if (b.uuid === bankUuid) {
        return {
          ...b,
          accounts: [
            ...b.accounts,
            {
              uuid: uuidv4(),
              accountNumber: accountData.accountNumber,
              currency: accountData.currency,
              isPrimary: accountData.isPrimary ?? false,
            },
          ],
        };
      }
      return b;
    });

    const updated = await this.model.findOneAndUpdate(
      { _id: counterpartyId },
      { $set: { banks: updatedBanks } },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Counterparty not found during update');
    }

    this.logger.log(
      `Account added to bank: counterparty=${counterpartyId}, bank=${bankUuid}, account=${accountData.accountNumber}`,
    );
    return updated;
  }

  async removeAccountFromBank(counterpartyId: string, bankUuid: string, accountUuid: string): Promise<ICounterparty> {
    const counterparty = await this.findById(counterpartyId);
    if (!counterparty) {
      throw new NotFoundException('Counterparty not found');
    }

    const bank = counterparty.banks.find((b) => b.uuid === bankUuid);

    if (!bank) {
      this.logger.warn(`Bank not found: counterparty=${counterpartyId}, bank=${bankUuid}`);
      throw new Error('Bank not found');
    }

    const account = bank.accounts.find((acc) => acc.uuid === accountUuid);
    if (!account) {
      this.logger.warn(`Account not found: bank=${bankUuid}, account=${accountUuid}`);
      throw new Error('Account not found');
    }

    if (bank.accounts.length === 1) {
      this.logger.warn(`Cannot remove last account from bank: bank=${bankUuid}`);
      throw new Error('Cannot remove the last account from bank');
    }

    const updatedBanks = counterparty.banks.map((b) => {
      if (b.uuid === bankUuid) {
        return {
          ...b,
          accounts: b.accounts.filter((acc) => acc.uuid !== accountUuid),
        };
      }
      return b;
    });

    const updated = await this.model.findOneAndUpdate(
      { _id: counterpartyId },
      { $set: { banks: updatedBanks } },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Counterparty not found during update');
    }

    this.logger.log(
      `Account removed from bank: counterparty=${counterpartyId}, bank=${bankUuid}, account=${accountUuid}`,
    );
    return updated;
  }

  async updateAccount(
    counterpartyId: string,
    bankUuid: string,
    accountUuid: string,
    updates: { isPrimary?: boolean },
  ): Promise<ICounterparty> {
    const counterparty = await this.findById(counterpartyId);
    if (!counterparty) {
      throw new NotFoundException('Counterparty not found');
    }

    const bank = counterparty.banks.find((b) => b.uuid === bankUuid);

    if (!bank) {
      this.logger.warn(`Bank not found: counterparty=${counterpartyId}, bank=${bankUuid}`);
      throw new Error('Bank not found');
    }

    const account = bank.accounts.find((acc) => acc.uuid === accountUuid);
    if (!account) {
      this.logger.warn(`Account not found: bank=${bankUuid}, account=${accountUuid}`);
      throw new Error('Account not found');
    }

    const updatedBanks = counterparty.banks.map((b) => {
      if (b.uuid === bankUuid) {
        return {
          ...b,
          accounts: b.accounts.map((acc) => {
            if (acc.uuid === accountUuid) {
              return {
                ...acc,
                ...updates,
              };
            }
            return acc;
          }),
        };
      }
      return b;
    });

    const updated = await this.model.findOneAndUpdate(
      { _id: counterpartyId },
      { $set: { banks: updatedBanks } },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Counterparty not found during update');
    }

    this.logger.log(`Account updated: counterparty=${counterpartyId}, bank=${bankUuid}, account=${accountUuid}`);
    return updated;
  }

  async updateApprovalStatus(id: string, data: ICounterpartyApprovalUpdate): Promise<ICounterparty> {
    const counterparty = await super.findOneOrException({ _id: id });

    const historyEvent = {
      status: data.lastApprovalStatus,
      createDate: data.lastApprovalDate || new Date(),
      createdBy: data.lastApprovedBy,
      comment: data.lastApprovalComment,
    };

    const updated = await this.model.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          lastApprovalStatus: data.lastApprovalStatus,
          lastApprovalDate: data.lastApprovalDate || new Date(),
          lastApprovedBy: data.lastApprovedBy,
          lastApprovalComment: data.lastApprovalComment,
        },
        $push: {
          statusHistory: historyEvent,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Counterparty not found during approval status update');
    }

    this.logger.log(
      `Counterparty approval status updated: ${id}, status: ${data.lastApprovalStatus}, owner: ${counterparty.createdBy}, addedToHistory: true`,
    );

    return updated;
  }

  async addFormPayment(counterpartyId: string, formPaymentId: string): Promise<void> {
    const result = await this.model.updateOne(
      { _id: counterpartyId, formPayments: { $ne: formPaymentId } },
      { $addToSet: { formPayments: formPaymentId } },
    );

    if (result.modifiedCount > 0) {
      this.logger.debug(`FormPayment added to counterparty: ${counterpartyId}, formPaymentId: ${formPaymentId}`);
    } else {
      this.logger.debug(`FormPayment already linked: ${counterpartyId}, formPaymentId: ${formPaymentId}`);
    }
  }

  async removeFormPayment(counterpartyId: string, formPaymentId: string): Promise<void> {
    await this.model.updateOne({ _id: counterpartyId }, { $pull: { formPayments: formPaymentId } });
    this.logger.debug(`FormPayment removed from counterparty: ${counterpartyId}, formPaymentId: ${formPaymentId}`);
  }

  async findOrCreateFromFormBankDetails(
    accountId: string,
    bankDetails: IBankDetailsInput,
  ): Promise<{ counterpartyId: string; bankUuid: string; accountUuid: string }> {
    this.validateBankDetailsInput(bankDetails);

    const counterpartyName = bankDetails.name;
    const counterpartyCountry = bankDetails.country || bankDetails.bankCountry;
    const bankUuid = uuidv4();
    const accountUuid = uuidv4();

    try {
      const createData = this.buildCounterpartyCreateData(
        accountId,
        counterpartyName,
        counterpartyCountry,
        bankDetails,
        bankUuid,
        accountUuid,
      );

      const counterparty = await this.create(createData);

      this.logger.log(
        `Counterparty created from FormPayment: ${counterparty._id}, name: ${counterpartyName}, owner: ${accountId}`,
      );

      return {
        counterpartyId: counterparty._id.toString(),
        bankUuid,
        accountUuid,
      };
    } catch (error) {
      // Handle duplicate error (Mongoose code 11000 OR our custom BadRequestException)
      if (error.code === 11000 || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        this.logger.warn(`Duplicate counterparty during create, retrying find: ${counterpartyName}`);

        return this.handleCounterpartyExists(
          accountId,
          counterpartyName,
          counterpartyCountry,
          bankDetails,
          bankUuid,
          accountUuid,
        );
      }

      throw error;
    }
  }

  private validateBankDetailsInput(bankDetails: IBankDetailsInput): void {
    if (!bankDetails.name || !bankDetails.bankName) {
      throw new BadRequestException('Counterparty name and bank name are required');
    }

    const counterpartyCountry = bankDetails.country || bankDetails.bankCountry;
    if (!counterpartyCountry) {
      throw new BadRequestException('Country information is required');
    }
  }

  private buildCounterpartyCreateData(
    accountId: string,
    counterpartyName: string,
    counterpartyCountry: string,
    bankDetails: IBankDetailsInput,
    bankUuid: string,
    accountUuid: string,
  ): ICounterpartyCreateDto {
    // Check if Russian by INN + country code match
    const isRussian = !!bankDetails.inn && RUSSIA_COUNTRY_CODES.includes(counterpartyCountry);

    return {
      createdBy: accountId,
      name: counterpartyName,
      country: counterpartyCountry,
      type: isRussian ? CounterpartyType.RUSSIAN : CounterpartyType.FOREIGN,
      inn: bankDetails.inn,
      legalAddress: bankDetails.address,
      banks: [
        {
          uuid: bankUuid,
          bankName: bankDetails.bankName,
          bankCountry: bankDetails.bankCountry || counterpartyCountry,
          bankAddress: bankDetails.bankAddress,
          swiftCode: bankDetails.swiftCode,
          accounts: [
            {
              uuid: accountUuid,
              accountNumber: bankDetails.accountNumber || '',
              currency: bankDetails.currency || DEFAULT_CURRENCY,
              isPrimary: true,
            },
          ],
        },
      ],
    };
  }

  private async handleCounterpartyExists(
    accountId: string,
    counterpartyName: string,
    counterpartyCountry: string,
    bankDetails: IBankDetailsInput,
    bankUuid: string,
    accountUuid: string,
  ): Promise<{ counterpartyId: string; bankUuid: string; accountUuid: string }> {
    const queryConditions = this.buildQueryConditions(accountId, counterpartyName, counterpartyCountry, bankDetails);
    const counterparty = await super.findOne(queryConditions);

    if (!counterparty) {
      throw new NotFoundException('Counterparty not found after duplicate error');
    }

    const existingBank = this.findMatchingBank(counterparty.banks, bankDetails);

    if (!existingBank && bankDetails.bankName) {
      return this.addNewBankToCounterparty(counterparty, counterpartyCountry, bankDetails, bankUuid, accountUuid);
    }

    if (existingBank && existingBank.accounts && bankDetails.accountNumber) {
      return this.handleExistingBank(counterparty, existingBank, bankDetails, accountUuid);
    }

    // Default: return existing bank's first account
    return {
      counterpartyId: counterparty._id.toString(),
      bankUuid: existingBank?.uuid || bankUuid,
      accountUuid: existingBank?.accounts[0]?.uuid || accountUuid,
    };
  }

  private async addNewBankToCounterparty(
    counterparty: ICounterparty,
    counterpartyCountry: string,
    bankDetails: IBankDetailsInput,
    bankUuid: string,
    accountUuid: string,
  ): Promise<{ counterpartyId: string; bankUuid: string; accountUuid: string }> {
    const newBank = this.buildBankData(counterpartyCountry, bankDetails, bankUuid, accountUuid);
    await this.update(counterparty._id.toString(), { addBanks: [newBank] });

    return {
      counterpartyId: counterparty._id.toString(),
      bankUuid,
      accountUuid,
    };
  }

  private async handleExistingBank(
    counterparty: ICounterparty,
    existingBank: ICounterpartyBank,
    bankDetails: IBankDetailsInput,
    accountUuid: string,
  ): Promise<{ counterpartyId: string; bankUuid: string; accountUuid: string }> {
    const accountExists = existingBank.accounts.some((acc) => acc.accountNumber === bankDetails.accountNumber);

    if (!accountExists) {
      await this.addAccountToExistingBank(counterparty, existingBank, bankDetails, accountUuid);
      return {
        counterpartyId: counterparty._id.toString(),
        bankUuid: existingBank.uuid,
        accountUuid,
      };
    }

    // Account already exists - return existing
    const existingAccount = existingBank.accounts.find((acc) => acc.accountNumber === bankDetails.accountNumber);
    return {
      counterpartyId: counterparty._id.toString(),
      bankUuid: existingBank.uuid,
      accountUuid: existingAccount?.uuid || accountUuid,
    };
  }

  private async addAccountToExistingBank(
    counterparty: ICounterparty,
    existingBank: ICounterpartyBank,
    bankDetails: IBankDetailsInput,
    accountUuid: string,
  ): Promise<void> {
    const updatedBanks = counterparty.banks.map((bank) => {
      if (bank.uuid === existingBank.uuid) {
        return {
          ...bank,
          accounts: [
            ...bank.accounts,
            {
              uuid: accountUuid,
              accountNumber: bankDetails.accountNumber!,
              currency: bankDetails.currency || DEFAULT_CURRENCY,
              isPrimary: false,
            },
          ],
        };
      }
      return bank;
    });

    await this.model.updateOne({ _id: counterparty._id }, { $set: { banks: updatedBanks } });

    this.logger.debug(
      `Added account to existing bank: counterparty=${counterparty._id}, bank=${existingBank.uuid}, account=${accountUuid}`,
    );
  }

  private buildQueryConditions(
    accountId: string,
    counterpartyName: string,
    counterpartyCountry: string,
    bankDetails: IBankDetailsInput,
  ): QueryConditions {
    const normalizedCountry = bankDetails.country || bankDetails.bankCountry || counterpartyCountry;
    const conditions: QueryConditions = {
      createdBy: accountId,
      isActive: true,
    };

    const isRussian = !!bankDetails.inn && normalizedCountry ? RUSSIA_COUNTRY_CODES.includes(normalizedCountry) : false;

    if (isRussian) {
      conditions.inn = bankDetails.inn;
    } else {
      conditions.name = counterpartyName;
      conditions.country = counterpartyCountry;
    }

    return conditions;
  }

  private findMatchingBank(banks: ICounterpartyBank[], bankDetails: IBankDetailsInput): ICounterpartyBank | undefined {
    return banks.find((b) => {
      if (b.swiftCode && bankDetails.swiftCode) {
        return b.swiftCode === bankDetails.swiftCode;
      }
      return b.bankName === bankDetails.bankName && b.bankCountry === bankDetails.bankCountry;
    });
  }

  private buildBankData(
    counterpartyCountry: string,
    bankDetails: IBankDetailsInput,
    bankUuid: string,
    accountUuid: string,
  ): ICounterpartyBank {
    return {
      uuid: bankUuid,
      bankName: bankDetails.bankName,
      bankCountry: bankDetails.bankCountry || counterpartyCountry,
      bankAddress: bankDetails.bankAddress,
      swiftCode: bankDetails.swiftCode,
      accounts: [
        {
          uuid: accountUuid,
          accountNumber: bankDetails.accountNumber || '',
          currency: bankDetails.currency || DEFAULT_CURRENCY,
          isPrimary: true,
        },
      ],
    };
  }

  async getApprovalHistoryIndicator(
    counterpartyId: string,
  ): Promise<{ requiresReview: boolean; monthsSinceApproval: number | null }> {
    const counterparty = await super.findOneOrException({ _id: counterpartyId });

    // PENDING, REJECTED, or never approved → requires review
    if (
      !counterparty.lastApprovalDate ||
      counterparty.lastApprovalStatus === CounterpartyApprovalStatus.REJECTED ||
      counterparty.lastApprovalStatus === CounterpartyApprovalStatus.PENDING
    ) {
      return { requiresReview: true, monthsSinceApproval: null };
    }

    const now = new Date();
    const approvalDate = new Date(counterparty.lastApprovalDate);

    // Calculate difference in days
    const daysDifference = Math.floor((now.getTime() - approvalDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsDifference = Math.floor(daysDifference / DAYS_PER_MONTH); // Approximate months for display

    return {
      requiresReview: daysDifference >= APPROVAL_EXPIRY_DAYS,
      monthsSinceApproval: monthsDifference,
    };
  }

  /**
   * Check if external compliance can be skipped for this counterparty
   * Returns true if counterparty was approved < 6 months ago
   * Used after internal compliance approval to auto-skip external compliance stage
   */
  async canSkipExternalCompliance(counterpartyId: string): Promise<boolean> {
    this.logger.debug(`Checking if external compliance can be skipped for counterparty: ${counterpartyId}`);

    const counterparty = await super.findOneOrException({ _id: counterpartyId });

    if (counterparty.lastApprovalStatus !== CounterpartyApprovalStatus.APPROVED) {
      this.logger.log(
        `Counterparty ${counterpartyId} - cannot skip: not approved (status: ${counterparty.lastApprovalStatus})`,
      );
      return false;
    }

    const indicator = await this.getApprovalHistoryIndicator(counterpartyId);

    const canSkip = !indicator.requiresReview;

    this.logger.log(
      `Counterparty ${counterpartyId} - can skip external compliance: ${canSkip} ` +
        `(status: ${counterparty.lastApprovalStatus}, months since approval: ${indicator.monthsSinceApproval})`,
    );

    return canSkip;
  }

  async findBankAndAccount(
    counterpartyId: string,
    bankUuid: string,
    accountUuid: string,
  ): Promise<{ bank: ICounterpartyBank; account: ICounterpartyBankAccount }> {
    const counterparty = await super.findOneOrException({ _id: counterpartyId });

    const bank = counterparty.banks.find((b) => b.uuid === bankUuid);
    if (!bank) {
      this.logger.error(`Bank not found: ${bankUuid}, counterparty: ${counterpartyId}`);
      throw new NotFoundException('Bank not found in counterparty');
    }

    const account = bank.accounts.find((a) => a.uuid === accountUuid);
    if (!account) {
      this.logger.error(`Account not found: ${accountUuid}, bank: ${bankUuid}, counterparty: ${counterpartyId}`);
      throw new NotFoundException('Account not found in bank');
    }

    return { bank, account };
  }

  async getCounterpartyRequests(
    counterpartyId: string,
    filters: ICounterpartyRequestsFilters,
  ): Promise<CounterpartyRequestsDto> {
    const counterparty = await super.findOneOrException({ _id: counterpartyId });
    const queryResult = await this.requestsHelper.query(counterpartyId, filters);

    return {
      counterparty: {
        _id: counterparty._id.toString(),
        name: counterparty.name,
        country: counterparty.country,
        inn: counterparty.inn,
      },
      statistics: queryResult.statistics,
      items: queryResult.items,
      hasNext: queryResult.hasNext,
    };
  }

  async getExternalComplianceStatistics(): Promise<ICounterpartyComplianceStatistics> {
    const [stats] = await this.formPaymentModel.aggregate([
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_PENDING_STATUSES] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$stage', EXTERNAL_APPROVED_STAGES] },
                    { $not: [{ $in: ['$status', EXTERNAL_CANCELED_STATUSES] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_REJECTED_STATUSES] }, 1, 0],
            },
          },
        },
      },
    ]);

    return {
      pending: stats?.pending || 0,
      approved: stats?.approved || 0,
      rejected: stats?.rejected || 0,
    };
  }

  /**
   * Lightweight lookup for counterparties by ids without heavy populate.
   * Used by FormPaymentService to enrich DTOs with basic counterparty/bank data.
   * Filters only active counterparties.
   */
  async findBasicByIds(ids: string[]): Promise<ICounterparty[]> {
    if (!ids || !ids.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));

    const docs = await this.model
      .find(
        {
          _id: { $in: uniqueIds },
          isActive: true,
        },
        {
          name: 1,
          country: 1,
          legalAddress: 1,
          banks: 1,
          lastApprovalStatus: 1,
        },
      )
      .lean()
      .exec();

    return docs as unknown as ICounterparty[];
  }

  /**
   * Lightweight lookup for counterparties by ids without heavy populate, including inactive ones.
   * Used for order generation and manager API where inactive counterparties should be included.
   */
  async findBasicByIdsIncludingInactive(ids: string[]): Promise<ICounterparty[]> {
    if (!ids || !ids.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));

    const docs = await this.model
      .find(
        {
          _id: { $in: uniqueIds },
        },
        {
          name: 1,
          country: 1,
          legalAddress: 1,
          banks: 1,
        },
      )
      .lean()
      .exec();

    return docs as unknown as ICounterparty[];
  }

  private async ensureCounterpartyIsUnique(data: ICounterpartyCreateDto): Promise<void> {
    const existingCounterparty = await this.findDuplicate(data);
    if (existingCounterparty) {
      this.logger.warn(
        `Duplicate counterparty found for INN: ${data.inn}, name: ${data.name}, owner: ${data.createdBy}`,
      );
      throw new BadRequestException('Counterparty with this identification already exists');
    }
  }

  private buildCreatePayload(
    data: ICounterpartyCreateDto,
  ): ICounterpartyCreateDto & { lastApprovalStatus: CounterpartyApprovalStatus; formPayments: string[] } {
    return {
      ...data,
      banks: this.assignBankAndAccountUuids(data.banks),
      lastApprovalStatus: CounterpartyApprovalStatus.PENDING,
      formPayments: [],
    };
  }

  private assignBankAndAccountUuids(banks: ICounterpartyBankInput[]): ICounterpartyBank[] {
    return banks.map(
      (bank): ICounterpartyBank => ({
        uuid: uuidv4(),
        bankName: bank.bankName,
        swiftCode: bank.swiftCode,
        bankCountry: bank.bankCountry,
        bankAddress: bank.bankAddress,
        accounts: bank.accounts.map((acc) => ({
          uuid: uuidv4(),
          accountNumber: acc.accountNumber,
          currency: acc.currency,
          isPrimary: acc.isPrimary ?? false,
        })),
      }),
    );
  }

  private validateCounterpartyData(data: ICounterpartyCreateDto): void {
    if (!data.name || !data.country) {
      throw new BadRequestException('Name and country are required');
    }

    if (data.type === CounterpartyType.RUSSIAN && !data.inn) {
      throw new BadRequestException('INN is required for Russian counterparties');
    }

    if (!data.banks || data.banks.length === 0) {
      throw new BadRequestException('At least one bank is required');
    }

    for (const bank of data.banks) {
      if (!bank.bankName || !bank.bankCountry) {
        throw new BadRequestException('Bank name and country are required');
      }
      if (!bank.accounts || bank.accounts.length === 0) {
        throw new BadRequestException('Each bank must have at least one account');
      }
      for (const account of bank.accounts) {
        if (!account.accountNumber || !account.currency) {
          throw new BadRequestException('Account number and currency are required');
        }
      }
    }
  }

  private validateUpdateData(data: ICounterpartyUpdateDto, counterparty: ICounterparty): void {
    // Identity fields cannot be changed
    if (data.name !== undefined && data.name !== counterparty.name) {
      throw new BadRequestException('Name cannot be changed');
    }
    if (data.country !== undefined && data.country !== counterparty.country) {
      throw new BadRequestException('Country cannot be changed');
    }
    if (data.inn !== undefined && data.inn !== counterparty.inn) {
      throw new BadRequestException('INN cannot be changed');
    }
  }

  private async findDuplicate(data: ICounterpartyCreateDto, includeInactive = false): Promise<ICounterparty | null> {
    const query: FilterQuery<Counterparty> = {
      createdBy: data.createdBy,
    };

    if (data.type === CounterpartyType.RUSSIAN && data.inn) {
      query.inn = data.inn;
    } else {
      query.name = data.name;
      query.country = data.country;
    }

    if (!includeInactive) {
      (query as any).isActive = true;
    }

    return super.findOne(query as any);
  }
}
