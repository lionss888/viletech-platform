import { ISchema } from 'lib/interfaces/schema.interface';
import { CounterpartyType, CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';
import { IAccount } from './account.interface';
import { IFormPayment } from './form-payment.interface';

export interface ICounterpartyBankAccount {
  uuid: string;
  accountNumber: string;
  currency: string;
  isPrimary: boolean;
}

export interface ICounterpartyBank {
  uuid: string;
  bankName: string;
  swiftCode?: string;
  bankCountry: string;
  bankAddress?: string;
  accounts: ICounterpartyBankAccount[];
}

export interface ICounterpartyStatusHistoryItem {
  status: CounterpartyApprovalStatus;
  createDate: Date;
  createdBy: string | IAccount;
  comment?: string;
}

export interface ICounterpartyBase {
  createdBy: string | IAccount;
  name: string;
  country: string;
  inn?: string;
  ogrn?: string;
  registrationNumber?: string;
  legalAddress?: string;
  type: CounterpartyType;
  banks: ICounterpartyBank[];
  lastApprovalStatus: CounterpartyApprovalStatus | null;
  lastApprovalDate: Date | null;
  lastApprovedBy?: string | IAccount;
  lastApprovalComment?: string;
  statusHistory: ICounterpartyStatusHistoryItem[];
  formPayments: (string | IFormPayment)[];
  isActive: boolean;
}

export interface ICounterparty extends ISchema, ICounterpartyBase {}
