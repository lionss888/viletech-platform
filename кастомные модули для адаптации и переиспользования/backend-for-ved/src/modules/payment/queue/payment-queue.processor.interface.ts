import { IPaymentCreateForForm } from '../service/payment.service.interface';
import { Job } from 'bull';

export interface IPaymentQueueProcessor {
  handleCreateForForm(job: Job<IPaymentCreateForForm>): Promise<void>;
}

export type IPaymentQueueData = IPaymentCreateForForm;
