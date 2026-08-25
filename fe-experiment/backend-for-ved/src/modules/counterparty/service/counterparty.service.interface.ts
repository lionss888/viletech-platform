import { IBaseService, IBaseOptions, IBaseQuery } from 'lib/services/base/base.service.interface';
import {
  ICounterparty,
  ICounterpartyBase,
  ICounterpartyBank,
  ICounterpartyBankAccount,
} from 'lib/interfaces/models/counterparty.interface';
import { CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { CounterpartyRequestsDto } from '../dto/counterparty-requests.dto';
import { AccountRole } from 'lib/enums/models/account.enums';

export interface ICounterpartyQuery extends IBaseQuery, Partial<ICounterpartyBase> {
  isActive?: boolean;
  lastApprovalStatus?: CounterpartyApprovalStatus;
  page?: number;
  limit?: number;
}

export interface ICounterpartyAccountInput {
  uuid?: string;
  accountNumber: string;
  currency: string;
  isPrimary?: boolean;
}

export interface ICounterpartyBankInput {
  uuid?: string;
  bankName: string;
  swiftCode?: string;
  bankCountry: string;
  bankAddress?: string;
  bik?: string;
  corrNumber?: string;
  accounts: ICounterpartyAccountInput[];
}

export interface ICounterpartyCreateDto {
  createdBy: string;
  name: string;
  country: string;
  type: 'russian' | 'foreign';
  inn?: string;
  ogrn?: string;
  registrationNumber?: string;
  legalAddress?: string;
  banks: ICounterpartyBankInput[];
}

export interface ICounterpartyUpdateDto {
  name?: string;
  country?: string;
  inn?: string;
  ogrn?: string;
  registrationNumber?: string;
  legalAddress?: string;
  banks?: ICounterpartyBankInput[];
  addBanks?: ICounterpartyBankInput[];
  removeBankUuids?: string[];
  isActive?: boolean;
  lastApprovalStatus?: CounterpartyApprovalStatus;
  lastApprovalDate?: Date;
  lastApprovedBy?: string;
  lastApprovalComment?: string;
}

export interface ICounterpartyApprovalUpdate {
  lastApprovalStatus: CounterpartyApprovalStatus;
  lastApprovalDate?: Date;
  lastApprovedBy?: string;
  lastApprovalComment?: string;
}

export interface ICounterpartyRequestsFilters {
  category?: string[];
  direction?: string[];
  clientCurrency?: string[];
  counterpartyCurrency?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  amountGte?: number;
  amountLte?: number;
  page?: number;
  limit?: number;
}

export interface ICounterpartyService
  extends IBaseService<
    ICounterparty,
    ICounterpartyQuery,
    IBaseOptions,
    ICounterpartyCreateDto,
    ICounterpartyUpdateDto
  > {
  listForAccount(
    account: { _id?: string; role?: AccountRole; roles?: AccountRole[] } | undefined,
    query?: Partial<ICounterpartyQuery>,
  ): Promise<IPaginateResult<ICounterpartyWithStatistics> & { statistics: ICounterpartyComplianceStatistics }>;
  getExternalComplianceStatistics(): Promise<ICounterpartyComplianceStatistics>;
  findById(id: string): Promise<ICounterparty | null>;
  findAll(query?: Partial<ICounterpartyQuery>): Promise<IPaginateResult<ICounterparty>>;
  findByAccount(accountId: string, query?: Partial<ICounterpartyQuery>): Promise<IPaginateResult<ICounterparty>>;
  create(data: ICounterpartyCreateDto): Promise<ICounterparty>;
  update(id: string, data: ICounterpartyUpdateDto): Promise<ICounterparty>;
  delete(id: string): Promise<void>;
  updateApprovalStatus(id: string, data: ICounterpartyApprovalUpdate): Promise<ICounterparty>;
  addFormPayment(counterpartyId: string, formPaymentId: string): Promise<void>;
  removeFormPayment(counterpartyId: string, formPaymentId: string): Promise<void>;
  findOrCreateFromFormBankDetails(
    accountId: string,
    bankDetails: Record<string, unknown>,
  ): Promise<{ counterpartyId: string; bankUuid: string; accountUuid: string }>;
  getApprovalHistoryIndicator(
    counterpartyId: string,
  ): Promise<{ requiresReview: boolean; monthsSinceApproval: number | null }>;
  canSkipExternalCompliance(counterpartyId: string): Promise<boolean>;
  findBasicByIds(ids: string[]): Promise<ICounterparty[]>;
  findBasicByIdsIncludingInactive(ids: string[]): Promise<ICounterparty[]>;
  findBankAndAccount(
    counterpartyId: string,
    bankUuid: string,
    accountUuid: string,
  ): Promise<{ bank: ICounterpartyBank; account: ICounterpartyBankAccount }>;
  getCounterpartyRequests(
    counterpartyId: string,
    filters: ICounterpartyRequestsFilters,
  ): Promise<CounterpartyRequestsDto>;
}

export interface ICounterpartyComplianceStatistics {
  pending: number;
  approved: number;
  rejected: number;
}

export interface ICounterpartyWithStatistics extends ICounterparty {
  statistics: ICounterpartyComplianceStatistics;
}
