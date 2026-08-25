import { IEmailField } from 'lib/interfaces/email-field.interface';
import { IAccount, IAccountAdminQuery, IAccountBase } from 'lib/interfaces/models/account.interface';
import { ICode, ICodeBase } from 'lib/interfaces/models/code.interface';
import { IBaseOptions, IBaseService } from 'lib/services/base/base.service.interface';
import { UpdateRateSettingsDto, RateSettingsResponseDto, PaginatedRateHistoryDto } from '../dto';

export interface IAccountService extends IBaseService<IAccount, IAccountAdminQuery> {
  createAdmin(): Promise<IAccount>;

  createAdminByRoot(data: IAccountCreateByRoot): Promise<IAccount>;

  verifyPassword(data: IVerifyPassword): Promise<IAccount>;

  updateByPairs(data: IAccountUpdateByPairs): Promise<void>;

  findOrCreate(account: any): Promise<IAccount>;

  verifyCode(data: ICodeBase): Promise<void>;

  updateRateSettings(accountId: string, dto: UpdateRateSettingsDto, userId: string): Promise<RateSettingsResponseDto>;

  /**
   * Replaces all rate settings for an account with the provided list.
   * Rules are unique per currencyScope; duplicates in the payload are rejected.
   */
  updateRateSettingsBulk(
    accountId: string,
    dtos: UpdateRateSettingsDto[],
    userId: string,
  ): Promise<RateSettingsResponseDto[]>;

  getRateSettings(accountId: string): Promise<RateSettingsResponseDto[]>;

  getRateHistory(accountId: string, page?: number, limit?: number): Promise<PaginatedRateHistoryDto>;

  deleteRateSettings(accountId: string, userId: string): Promise<void>;
}

export interface IAccountOptions extends IBaseOptions {}

export interface IVerifyPassword {
  email: string;
  password: string;
}

export interface IAccountSiteUpdate extends Pick<Partial<IAccount>, 'fullName' | 'lang'> {
  telegramUserName?: string;
}

export interface IAccountAdminUpdate extends Partial<IAccountBase>, IAccountSiteUpdate {
  telegramUserId?: number;
  password?: string;
  addOrganizations?: string[];
  removeOrganizations?: string[];
}

export interface IAccountUpdatePasswordByCode {
  code: string;
  oldPassword: string;
  newPassword: string;
}

export interface IAccountUpdateEmailByCode extends IEmailField {
  code: string;
}

export interface IAccountCreate extends Pick<IAccount, 'email'> {
  password: string;
}

export interface IAccountCreateByRoot extends Pick<IAccount, 'email' | 'fullName' | 'roles'> {
  password: string;
}

export interface IAccountVerifySecurityCode extends Pick<ICode, 'code' | 'type'> {
  account: IAccount;
}

export interface IAccountMakeSecurityCode extends Pick<ICode, 'type'> {
  account: IAccount;
}

export interface IAccountCode {
  code?: string;
}
export interface IAccountUpdateSiteById {
  _id: string;
  update: IAccountSiteUpdate;
}

export interface IAccountUpdateByPairs {
  pairs: IAccountUpdateSiteById[];
}
