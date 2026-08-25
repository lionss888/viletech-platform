import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import * as _ from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './account.schema';
import { FilterQuery, PaginateModel, PopulateOptions, Types } from 'mongoose';
import {
  IAccountAdminUpdate,
  IAccountCreate,
  IAccountCreateByRoot,
  IAccountService,
  IAccountUpdateByPairs,
  IVerifyPassword,
} from './account.service.interface';
import moment from 'moment';
import { IAccount, IAccountAdminQuery, IAccountBase, IAccountQuery } from 'lib/interfaces/models/account.interface';
import { BaseService } from 'lib/services/base/base.service';
import { ConfigService } from '@nestjs/config';
import { AccountPattern, AccountRole } from '../../../lib/enums/models/account.enums';
import { Lang } from '../../../lib/enums/common.enums';
import { ICodeBase } from '../../../lib/interfaces/models/code.interface';
import { CodePattern } from '../../../lib/enums/models/code.enums';
import { UpdateQuery } from 'mongoose';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { SocketPattern } from '../../../lib/enums/models/socket.enum';
import { SenderPattern } from 'lib/enums/models/sender.enums';
import { SenderAccountEvents } from 'lib/enums/models/sender.account.enums';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from 'lib/enums/models/socket.enum';
import { ISocketMessage } from 'lib/interfaces/models/socket.interface';
import { IVirtualAccountService } from '../../virtual-account/service/virtual-account.service.interface';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { currencyType } from '../../currency/currency.contants';
import { CurrencyType } from '../../../lib/enums/models/currency.enums';
import { VirtualAccountType } from '../../../lib/enums/models/virtual-account.enums';
import { IAccountRateSettings, IAccountRateHistoryEntry, IAccountRateRewardSettings } from '../interfaces';
import {
  UpdateRateSettingsDto,
  RateSettingsResponseDto,
  RateHistoryEntryDto,
  PaginatedRateHistoryDto,
  UserResponseDto,
  AccountRateRewardSettingsResponseDto,
} from '../dto';

@Injectable()
export class AccountService
  extends BaseService<IAccount, Account, IAccountQuery>
  implements IAccountService, OnApplicationBootstrap
{
  private readonly logger: Logger = new Logger('AccountService');

  constructor(
    @InjectModel(Account.name) readonly model: PaginateModel<Account>,
    @InjectNats() readonly client: NatsClientProxy,
    private configService: ConfigService,
    @Inject('IVirtualAccountService') private readonly virtualAccountService: IVirtualAccountService,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.model.syncIndexes();
  }

  async create({ password, ...data }: IAccountCreate) {
    const existsAccount = await this.model.findOne({ email: data.email }).exec();

    if (existsAccount?.active) {
      throw new BadRequestException('Account exist.');
    }

    const isNewAccount = !existsAccount;
    const account = existsAccount || new this.model(data);

    account.setPassword(password);

    await account.save();

    // Создаем виртуальные счета только для новых пользователей
    if (isNewAccount) {
      await this.createVirtualAccountsForUser(account._id.toString());
    }

    return account;
  }

  /**
   * Создает виртуальные счета для пользователя для всех валют
   */
  private async createVirtualAccountsForUser(accountId: string): Promise<void> {
    try {
      // Получаем все валюты
      const allCurrencies = Object.values(AllCurrencies);

      for (const currency of allCurrencies) {
        try {
          const accountType = this.getVirtualAccountType(currency);

          // Проверяем, существует ли уже виртуальный счет
          const exists = await this.virtualAccountService.findOne({
            account: accountId,
            currency: currency,
            type: accountType,
          });

          if (exists) {
            continue;
          }

          // Создаем виртуальный счет с нулевыми значениями
          await this.virtualAccountService.create({
            account: accountId,
            currency: currency,
            type: accountType,
            available: 0,
            reserved: 0,
            totalBalance: 0,
          });
        } catch (error) {
          this.logger.error(
            `Failed to create virtual account for account ${accountId}, currency ${currency}: ${error.message}`,
          );
          // Продолжаем обработку других валют
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create virtual accounts for account ${accountId}: ${error.message}`);
      // Не бросаем ошибку, чтобы не прервать процесс регистрации
    }
  }

  /**
   * Определяет тип виртуального счета (fiat/crypto) на основе типа валюты
   */
  private getVirtualAccountType(currency: AllCurrencies): VirtualAccountType {
    const currencyTypeValue = currencyType[currency];
    if (currencyTypeValue === CurrencyType.COIN || currencyTypeValue === CurrencyType.STABLECOIN) {
      return VirtualAccountType.CRYPTO;
    }
    return VirtualAccountType.FIAT;
  }

  async createAdmin(): Promise<IAccount> {
    const email = this.configService.get('initAdmin.email');
    const password = this.configService.get('initAdmin.password');

    if (!email || !password) {
      throw new BadRequestException('Init email or password do not pass.');
    }
    const exist = await this.model.exists({ email }).exec();

    if (exist) {
      throw new BadRequestException('Account with this admin email already exist.');
    }

    const createData = {
      email,
      roles: [AccountRole.ROOT],
      fullName: 'admin',
      lang: 'ru',
      active: true,
      confirmed: true,
    };

    const account = new this.model(createData);

    account.setPassword(password);

    await account.save();

    return account as IAccount;
  }

  async createAdminByRoot(data: IAccountCreateByRoot): Promise<IAccount> {
    const exist = await this.model.exists({ email: data.email }).exec();

    if (exist) {
      throw new BadRequestException('Account with this admin email already exist.');
    }

    const createData = {
      email: data.email,
      roles: data.roles,
      fullName: data.fullName,
      lang: 'ru',
      active: true,
      confirmed: true,
    };

    const account = new this.model(createData);

    account.setPassword(data.password);

    await account.save();

    return account as IAccount;
  }

  async updateOne(findData: IAccountQuery, updateData: IAccountAdminUpdate): Promise<IAccount> {
    const updateQuery: Record<string, unknown> = _.omit(updateData, ['password']);

    const prevAccount = await this.model.findOne({ _id: findData._id }).lean();

    await super.updateOne({ _id: findData._id }, updateQuery);

    const account = await this.model.findOne({ _id: findData._id });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (updateData.password) {
      account.setPassword(updateData.password);
    }

    await account.save();

    // Уведомление комплаенса при установке флага корпоративного клиента
    const wasCorporateEnabled =
      !prevAccount?.isCorporateClient &&
      (typeof updateData.isCorporateClient === 'boolean' ? updateData.isCorporateClient : account.isCorporateClient);

    if (wasCorporateEnabled) {
      try {
        const complianceAccounts = await this.client.send<Pick<IAccount, '_id' | 'email'>[]>(AccountPattern.FIND_MANY, {
          query: { roles: [AccountRole.COMPLIANCE_OFFICER] },
          options: { select: 'email _id' },
        });

        const managerEmails = _.uniq(
          _.map(complianceAccounts, 'email')
            .filter(Boolean)
            .map((email) => email.toLowerCase()),
        );

        if (managerEmails.length) {
          await this.client.send(SenderPattern.SEND_ADMINS, {
            type: SenderAccountEvents.CORPORATE_FLAG_ENABLED,
            managerEmails,
            data: { email: account.email, accountId: String(account._id) },
            language: 'ru',
          });
        }

        const complianceIds = _.uniq(
          complianceAccounts
            .map((c) => (c as any)._id)
            .filter(Boolean)
            .map((id) => id.toString()),
        );

        if (complianceIds.length) {
          const payload = {
            eventType: SenderAccountEvents.CORPORATE_FLAG_ENABLED,
            accountId: String(account._id),
            email: account.email,
            isCorporateClient: account.isCorporateClient,
          };

          const socketMessages: ISocketMessage<typeof payload>[] = complianceIds.map((id) => ({
            account: id,
            data: {
              action: SocketMessageAction.UPDATE,
              context: SocketMessageContext.ACCOUNT,
              payload,
            },
          }));

          await this.client.emit(SocketEventPattern.SEND_MANY, socketMessages);
        }
      } catch (e) {
        this.logger.error(`Failed to notify compliance about corporate flag: ${e?.message || e}`);
      }
    }

    if (updateData.blocked) {
      await this.client.send(SocketPattern.DISCONNECT_ONE, {
        account: account._id,
      });
    }

    return this.toPlain(account);
  }

  async verifyCode(data: ICodeBase) {
    const account = await this.model.findOne({ _id: data.account }).exec();

    if (account.verify?.lastDate && moment(account.verify?.lastDate) < moment().subtract(1, 'hour')) {
      account.verify.count = 0;
      await account.save();
    }

    if (account.verify.count > 4) {
      throw new BadRequestException('Many attempts, try later.');
    }

    const verifyCode = await this.client.send<boolean>(CodePattern.VERIFY, data);

    if (!verifyCode) {
      account.verify.count++;
      account.verify.lastDate = moment().toDate() as Date;
      await account.save();
      throw new BadRequestException('Code is not valid.');
    }
  }

  async verifyPassword(data: IVerifyPassword) {
    const account = await this.model.findOne({ email: data.email }).exec();

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.verify?.lastDate && moment(account.verify?.lastDate) < moment().subtract(1, 'hour')) {
      account.verify.count = 0;
      try {
        await account.save();
      } catch (e) {
        const error = e as Error & { message?: string };
        this.logger.error(
          `Failed to reset verify counter for account ${account._id} during login`,
          error.message || error,
        );
      }
    }

    if (account.verify.count > 4) {
      throw new BadRequestException('Many requests login, try later.');
    }

    if (!account.verifyPassword(data.password)) {
      account.verify.count++;
      account.verify.lastDate = moment().toDate() as Date;
      try {
        await account.save();
      } catch (e) {
        const error = e as Error & { message?: string };
        this.logger.error(
          `Failed to persist verify counter for account ${account._id} on incorrect password`,
          error.message || error,
        );
      }
      throw new BadRequestException('Incorrect password.');
    }

    return this.toPlain(account);
  }

  async updateByPairs(data: IAccountUpdateByPairs) {
    const bulkUpdates = _.map(data.pairs, ({ _id, update }) => {
      return {
        updateOne: {
          filter: { _id },
          update,
        },
      };
    });

    await this.model.bulkWrite(bulkUpdates);
  }

  async findOrCreate(externalAccount) {
    let account = await super.findOne({ email: externalAccount.email });

    if (!account) {
      let createData: IAccountBase = {
        email: externalAccount?.email,
        externalId: externalAccount.id,
        confirmed: true,
        active: true,
        fullName: '',
        lang: Lang.RU,
        blocked: false,
        enablePostpay: false,
        roles: [AccountRole.USER],
        verification: {
          cuv1: externalAccount?.kyb_statuses?.KYB1?.status === 'SUCCESS',
          cuv2: externalAccount?.kyb_statuses?.KYB2?.status === 'SUCCESS',
        },
      };

      account = await super.create(createData);

      // Создаем виртуальные счета для всех пользователей
      await this.createVirtualAccountsForUser(account._id.toString());
    } else {
      account = await super.updateOne(
        { _id: account._id },
        {
          email: externalAccount?.email,
          verification: {
            cuv1: externalAccount?.kyb_statuses?.KYB1?.status === 'SUCCESS',
            cuv2: externalAccount?.kyb_statuses?.KYB2?.status === 'SUCCESS',
          },
        },
      );
    }

    return account;
  }

  protected async makeQuery(findData: IAccountAdminQuery) {
    const query: FilterQuery<Account> = {};

    if (findData._id) {
      query._id = findData._id;
    }

    if (findData._ids) {
      query._id = { $in: findData._ids };
    }

    if (findData.fullName) {
      query.fullName = new RegExp(findData.fullName, 'g');
    }

    if (findData.email) {
      query.email = new RegExp(findData.email, 'g');
    }

    if (findData.emailStrict) {
      query.email = findData.emailStrict;
    }

    if (_.isBoolean(findData.active)) {
      query.active = findData.active;
    }

    if (_.isBoolean(findData.blocked)) {
      query.blocked = findData.blocked;
    }

    if (findData.roles) {
      query.roles = { ...query.roles, $in: findData.roles };
    }

    if (findData.role) {
      query.roles = { ...query.roles, $in: [findData.role] };
    }

    if (findData.rolesNe) {
      query.roles = { ...query.roles, $nin: findData.rolesNe };
    }

    if (findData.roleNe) {
      query.roles = { ...query.roles, $nin: [findData.roleNe] };
    }

    return query;
  }

  protected makeUpdate({
    addOrganizations,
    removeOrganizations,
    telegramUserId,
    telegramUserName,
    ...data
  }: IAccountAdminUpdate) {
    const setOps: Record<string, unknown> = { ...data };
    const unsetOps: Record<string, ''> = {};

    let addToSetOps: Record<string, unknown> | undefined = undefined;
    let pullOps: Record<string, unknown> | undefined = undefined;
    if (addOrganizations?.length) {
      addToSetOps = { organizations: { $each: addOrganizations } };
    }

    if (removeOrganizations?.length) {
      pullOps = { organizations: { $in: removeOrganizations } };
    }

    if (!_.isUndefined(telegramUserId)) {
      if (_.isNumber(telegramUserId)) {
        setOps['telegram.userId'] = telegramUserId;
      }

      if (_.isNull(telegramUserId)) {
        unsetOps['telegram.userId'] = '';
      }
    }

    if (!_.isUndefined(telegramUserName)) {
      if (_.isString(telegramUserName)) {
        setOps['telegram.username'] = telegramUserName;
      }
      if (_.isNull(telegramUserName)) {
        unsetOps['telegram.username'] = '';
      }
    }

    const updateData: UpdateQuery<Account> = {
      $set: setOps,
      ...(Object.keys(unsetOps).length ? { $unset: unsetOps } : {}),
      ...(addToSetOps ? { $addToSet: addToSetOps } : {}),
      ...(pullOps ? { $pull: pullOps } : {}),
    } as UpdateQuery<Account>;

    return updateData;
  }

  protected makePopulate(options?: IBaseOptions): PopulateOptions | (PopulateOptions | string)[] {
    const populates = [];
    const includes = options?.include;

    if (includes) {
      if (includes.includes('organizations')) {
        populates.push({
          path: 'organizations',
          populate: {
            path: 'organizationCard',
          },
        });
      }
    }

    return populates;
  }

  /**
   * Updates rate settings for an account and creates history entry
   *
   * Business Logic:
   * - Validates rate settings (tiers sorted, no duplicates, at least one fee component per tier)
   * - Creates immutable history snapshot
   * - Atomic update: settings + history in single operation
   *
   * @param accountId - Account to update
   * @param dto - New rate settings
   * @param userId - ROOT/ADMIN performing the change
   * @returns Updated rate settings with populated updatedBy user
   *
   * @throws NotFoundException - Account not found
   * @throws BadRequestException - Invalid settings
   */
  async updateRateSettings(
    accountId: string,
    dto: UpdateRateSettingsDto,
    userId: string,
  ): Promise<RateSettingsResponseDto> {
    // 1. Validate account exists
    const account = await this.model.findOne({ _id: accountId }).exec();
    if (!account) {
      this.logger.error(`Account ${accountId} not found when updating rate settings`, 'AccountService');
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    // 2. Validate DTO (mode-specific requirements)
    this.validateRateSettings(dto);

    // 3. Build AccountRateSettings object for the given currency scope
    const newSettings: IAccountRateSettings = {
      currencyScope: dto.currencyScope || 'all',
      rateSource: dto.rateSource,
      reward: this.buildRewardSettings(dto),
      updatedAt: new Date(),
      updatedBy: new Types.ObjectId(userId),
    };

    // 4. Merge with existing settings (upsert by currencyScope)
    const existingSettings: IAccountRateSettings[] = Array.isArray(account.rateSettings)
      ? account.rateSettings
      : account.rateSettings
      ? [account.rateSettings as unknown as IAccountRateSettings]
      : [];

    const updatedSettings: IAccountRateSettings[] = [...existingSettings];
    const idx = updatedSettings.findIndex((s) => s.currencyScope === newSettings.currencyScope);
    if (idx >= 0) {
      updatedSettings[idx] = newSettings;
    } else {
      updatedSettings.push(newSettings);
    }

    // 5. Create history entry (deep copy for immutability)
    const historyEntry: IAccountRateHistoryEntry = {
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      settings: JSON.parse(JSON.stringify(updatedSettings)),
    };

    // 6. Update atomically (settings + history in single operation)
    await this.model
      .updateOne(
        { _id: accountId },
        {
          $set: { rateSettings: updatedSettings },
          $push: { rateHistory: historyEntry },
        },
      )
      .exec();

    this.logger.log(`Rate settings updated for account ${accountId} by user ${userId}`, 'AccountService');

    // 7. Fetch user details and return response for the updated rule
    const updatedBy = await this.model.findOne({ _id: userId }).exec();

    return this.mapToRateSettingsResponse(newSettings, updatedBy);
  }

  /**
   * Replaces all rate settings for an account with the provided list.
   *
   * Business rules:
   * - At least one rule must be provided
   * - currencyScope must be unique per account (no duplicates in payload)
   * - Each rule is validated with the same logic as single update
   */
  async updateRateSettingsBulk(
    accountId: string,
    dtos: UpdateRateSettingsDto[],
    userId: string,
  ): Promise<RateSettingsResponseDto[]> {
    const account = await this.model.findOne({ _id: accountId }).exec();
    if (!account) {
      this.logger.error(`Account ${accountId} not found when bulk-updating rate settings`, 'AccountService');
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    if (!dtos || dtos.length === 0) {
      throw new BadRequestException('At least one rate settings rule is required');
    }

    const seenScopes = new Set<string>();
    const now = new Date();
    const updatedById = new Types.ObjectId(userId);

    const newSettings: IAccountRateSettings[] = dtos.map((dto, index) => {
      this.validateRateSettings(dto);

      const scope = dto.currencyScope || 'all';

      if (seenScopes.has(scope)) {
        throw new BadRequestException(`Duplicate currencyScope '${scope}' at index ${index}`);
      }
      seenScopes.add(scope);

      return {
        currencyScope: scope,
        rateSource: dto.rateSource,
        reward: this.buildRewardSettings(dto),
        updatedAt: now,
        updatedBy: updatedById,
      };
    });

    const historyEntry: IAccountRateHistoryEntry = {
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      settings: JSON.parse(JSON.stringify(newSettings)),
    };

    await this.model
      .updateOne(
        { _id: accountId },
        {
          $set: { rateSettings: newSettings },
          $push: { rateHistory: historyEntry },
        },
      )
      .exec();

    this.logger.log(
      `Rate settings bulk updated for account ${accountId} by user ${userId}, total rules: ${newSettings.length}`,
      'AccountService',
    );

    const updatedBy = await this.model.findOne({ _id: userId }).exec();

    return newSettings.map((settings) => this.mapToRateSettingsResponse(settings, updatedBy));
  }

  /**
   * Fetches current rate settings for an account
   *
   * @param accountId - Account ID
   * @returns Current rate settings or null if not configured
   *
   * @throws NotFoundException - Account not found
   */
  async getRateSettings(accountId: string): Promise<RateSettingsResponseDto[]> {
    const account = await this.model.findOne({ _id: accountId }, { rateSettings: 1 }).exec();

    if (!account) {
      this.logger.error(`Account ${accountId} not found when fetching rate settings`, 'AccountService');
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    if (!account.rateSettings || account.rateSettings.length === 0) {
      return [];
    }

    const settingsArray: IAccountRateSettings[] = Array.isArray(account.rateSettings)
      ? (account.rateSettings as unknown as IAccountRateSettings[])
      : [account.rateSettings as unknown as IAccountRateSettings];

    // Populate all updatedBy users in bulk
    const userIds = [
      ...new Set(
        settingsArray
          .map((s) => s.updatedBy)
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    ];

    const users = await this.model.find({ _id: { $in: userIds } }).exec();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return settingsArray.map((s) => {
      const updatedBy = userMap.get(s.updatedBy.toString());
      return this.mapToRateSettingsResponse(s, updatedBy);
    });
  }

  /**
   * Fetches paginated rate history with user details populated
   *
   * @param accountId - Account ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page (default: 20, max: 100)
   * @returns Paginated history entries
   *
   * @throws NotFoundException - Account not found
   */
  async getRateHistory(accountId: string, page: number = 1, limit: number = 20): Promise<PaginatedRateHistoryDto> {
    const account = await this.model.findOne({ _id: accountId }, { rateHistory: 1 }).exec();

    if (!account) {
      this.logger.error(`Account ${accountId} not found when fetching rate history`, 'AccountService');
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const history = account.rateHistory || [];

    // Sort by changedAt descending (latest first)
    const sorted = [...history].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

    // Paginate
    const total = sorted.length;
    const pages = Math.ceil(total / Math.min(limit, 100));
    const start = (page - 1) * limit;
    const end = start + limit;
    const entries = sorted.slice(start, end);

    // Populate users for changedBy and settings.updatedBy (bulk fetch for efficiency)
    const userIds = new Set<string>();
    entries.forEach((e) => {
      userIds.add(e.changedBy.toString());
      if (Array.isArray(e.settings)) {
        e.settings.forEach((s) => {
          if (s?.updatedBy) {
            userIds.add(s.updatedBy.toString());
          }
        });
      }
    });

    const users = await this.model.find({ _id: { $in: Array.from(userIds) } }).exec();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Map to response DTOs
    const enrichedEntries: RateHistoryEntryDto[] = entries.map((entry) => {
      const changedByUser = userMap.get(entry.changedBy.toString());
      let settingsResponse: RateSettingsResponseDto[] | null = null;

      if (entry.settings && entry.settings.length > 0) {
        // Collect all updatedBy users for this snapshot
        const snapshotUserIds = [...new Set(entry.settings.map((s) => s.updatedBy.toString()))];
        const snapshotUsers = snapshotUserIds.map((id) => userMap.get(id)).filter((u): u is Account => !!u);
        const snapshotUserMap = new Map(snapshotUsers.map((u) => [u._id.toString(), u]));

        settingsResponse = entry.settings.map((s) =>
          this.mapToRateSettingsResponse(s, snapshotUserMap.get(s.updatedBy.toString())),
        );
      }

      return {
        changedAt: entry.changedAt,
        changedBy: this.mapToUserResponse(changedByUser),
        settings: settingsResponse,
      };
    });

    return {
      entries: enrichedEntries,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  /**
   * Removes rate settings, reverts to default behavior
   * Creates final history entry documenting the removal
   *
   * @param accountId - Account ID
   * @param userId - ROOT/ADMIN performing the removal
   *
   * @throws NotFoundException - Account not found
   */
  async deleteRateSettings(accountId: string, userId: string): Promise<void> {
    const account = await this.model.findOne({ _id: accountId }).exec();

    if (!account) {
      this.logger.error(`Account ${accountId} not found when deleting rate settings`, 'AccountService');
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    // Create final history entry documenting removal
    const historyEntry: IAccountRateHistoryEntry = {
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      settings: null,
    };

    await this.model
      .updateOne(
        { _id: accountId },
        {
          $unset: { rateSettings: '' },
          $push: { rateHistory: historyEntry },
        },
      )
      .exec();

    this.logger.log(`Rate settings removed for account ${accountId} by user ${userId}`, 'AccountService');
  }

  /**
   * Validates rate settings DTO business rules
   *
   * @throws BadRequestException if invalid
   */
  private validateRateSettings(dto: UpdateRateSettingsDto): void {
    // Validate mode-specific requirements
    if (dto.rewardMode === 'same_for_all') {
      if (!dto.sameForAll) {
        throw new BadRequestException('sameForAll is required when rewardMode is same_for_all');
      }
      if (dto.tiers) {
        throw new BadRequestException('tiers must be undefined when rewardMode is same_for_all');
      }
    } else if (dto.rewardMode === 'by_amount') {
      if (!dto.tiers || dto.tiers.length === 0) {
        throw new BadRequestException('tiers is required (at least 1 tier) when rewardMode is by_amount');
      }
      if (dto.sameForAll) {
        throw new BadRequestException('sameForAll must be undefined when rewardMode is by_amount');
      }

      // Validate that each tier has at least one fee component
      for (let i = 0; i < dto.tiers.length; i++) {
        const tier = dto.tiers[i];
        const hasFeeComponent =
          (tier.above?.feePercentBps ?? 0) > 0 || (tier.above?.feeFixMinor ?? 0) > 0;

        if (!hasFeeComponent) {
          throw new BadRequestException(`Tier ${i} must have at least one fee component (percent or fixed)`);
        }
      }
    }
  }

  /**
   * Builds reward settings object from DTO
   */
  private buildRewardSettings(dto: UpdateRateSettingsDto): IAccountRateRewardSettings {
    if (dto.rewardMode === 'same_for_all') {
      return {
        mode: 'same_for_all',
        sameForAll: dto.sameForAll,
      };
    } else {
      return {
        mode: 'by_amount',
        tiers: dto.tiers,
      };
    }
  }

  /**
   * Maps internal rate settings to response DTO
   */
  private mapToRateSettingsResponse(
    settings: IAccountRateSettings,
    user: Account | null | undefined,
  ): RateSettingsResponseDto {
    return {
      currencyScope: settings.currencyScope || 'all',
      rateSource: settings.rateSource,
      reward: this.mapRewardSettings(settings.reward),
      updatedAt: settings.updatedAt,
      updatedBy: user ? this.mapToUserResponse(user) : null,
    } as RateSettingsResponseDto;
  }

  /**
   * Maps reward settings to response DTO
   */
  private mapRewardSettings(reward: IAccountRateRewardSettings): AccountRateRewardSettingsResponseDto {
    if (reward.mode === 'same_for_all') {
      return {
        mode: 'same_for_all',
        sameForAll: reward.sameForAll
          ? {
              feePercentBps: reward.sameForAll.feePercentBps,
              feeFixMinor: reward.sameForAll.feeFixMinor,
            }
          : undefined,
      };
    } else {
      return {
        mode: 'by_amount',
        tiers: reward.tiers
          ? reward.tiers.map((tier) => ({
              thresholdMinor: tier.thresholdMinor,
              above: tier.above
                ? {
                    feePercentBps: tier.above.feePercentBps,
                    feeFixMinor: tier.above.feeFixMinor,
                  }
                : undefined,
            }))
          : undefined,
      };
    }
  }

  /**
   * Maps account to user response DTO
   */
  private mapToUserResponse(account: Account | null | undefined): UserResponseDto {
    if (!account) {
      return {
        id: '',
        name: 'Unknown',
        email: 'unknown@example.com',
      };
    }

    return {
      id: account._id.toString(),
      name: account.fullName || account.email,
      email: account.email,
    };
  }
}
