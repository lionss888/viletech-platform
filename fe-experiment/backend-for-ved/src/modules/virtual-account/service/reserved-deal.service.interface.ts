import { IReservedDeal } from 'lib/interfaces/models/reserved-deal.interface';

export interface IReservedDealService {
  create(formPaymentId: string, virtualAccountId: string): Promise<IReservedDeal>;
  findByFormPaymentAndVirtualAccount(
    formPaymentId: string,
    virtualAccountId: string,
  ): Promise<IReservedDeal | null>;
  findByVirtualAccount(virtualAccountId: string): Promise<IReservedDeal[]>;
  delete(formPaymentId: string, virtualAccountId: string): Promise<void>;
  exists(formPaymentId: string, virtualAccountId: string): Promise<boolean>;
}

export interface IReservedDealCreate {
  formPayment: string;
  virtualAccount: string;
  reservedDate?: Date;
}

export interface IReservedDealQuery {
  formPayment?: string;
  virtualAccount?: string;
}
