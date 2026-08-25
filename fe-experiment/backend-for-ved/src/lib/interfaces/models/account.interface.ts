import { ISchema } from '../schema.interface';
import { IBaseQuery } from '../../services/base/base.service.interface';
import { AccountRole } from '../../enums/models/account.enums';
import { Lang } from '../../enums/common.enums';
import { IOrganization } from './organization.interface';
import { IRequisites } from '../bank-requisites.interface';
import { IAccountRateSettings, IAccountRateHistoryEntry } from '../../../modules/account/interfaces';

export interface IAccountBase {
  externalId?: string;
  email: string;
  phone?: string;
  requisites?: IRequisites[];
  organizations?: string[] | IOrganization[];
  confirmed: boolean;
  active: boolean;
  fullName?: string;
  lang: Lang;
  blocked: boolean;
  roles: AccountRole[];
  verification?: IAccountVerification;
  feePercent?: number;
  telegram?: IAccountTelegram;
  enablePostpay: boolean;
  // Корпоративный клиент: пропускает закрывающие документы
  isCorporateClient?: boolean;
  /**
   * Commission rules for the account.
   * Multiple rules are allowed (e.g. 'all' + per-currency overrides).
   */
  rateSettings?: IAccountRateSettings[];
  rateHistory?: IAccountRateHistoryEntry[];
}

export interface IAccountVerification {
  cuv1: boolean;
  cuv2: boolean;
}

export interface IAccountVerify {
  count: number;
  lastDate: Date;
}

export interface IAccountTelegram {
  username?: string;
  userId?: number;
}

export interface IAccount extends ISchema, IAccountBase {}

export interface IAccountShort {
  _id: string;
  email: string;
  fullName?: string;
}

export interface IAccountFull extends IAccount {
  organizations?: IOrganization[];
}

export interface IAccountQuery extends Partial<IAccountBase>, IBaseQuery {
  _id?: string;
  _ids?: string[];
  ranks?: string[];
  withoutId?: string;
  emailStrict?: string;
}

export interface IAccountAdminQuery extends IAccountQuery {
  role?: AccountRole;
  roles?: AccountRole[];
  roleNe?: AccountRole;
  rolesNe?: AccountRole[];
}
