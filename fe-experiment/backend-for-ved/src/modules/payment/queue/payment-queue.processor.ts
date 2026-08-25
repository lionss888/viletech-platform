import { Process, Processor } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { IPaymentQueueProcessor } from './payment-queue.processor.interface';
import { Inject, Logger } from '@nestjs/common';
import { PAYMENT_SERVICE } from '../payment.constants';
import { IPaymentCreateForForm, IPaymentService } from '../service/payment.service.interface';
import { Job } from 'bull';
import { PaymentPattern } from '../../../lib/enums/models/payment.enums';

@Processor(JobQueueName.PAYMENT_QUEUE)
export class PaymentQueueProcessor implements IPaymentQueueProcessor {
  private readonly logger = new Logger(PaymentQueueProcessor.name);

  constructor(@Inject(PAYMENT_SERVICE) private readonly service: IPaymentService) {}

  @Process(PaymentPattern.CREATE_FOR_FORM_PAYMENT)
  async handleCreateForForm(job: Job<IPaymentCreateForForm>): Promise<void> {
    try {
      await this.service.createForForm(job.data);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
