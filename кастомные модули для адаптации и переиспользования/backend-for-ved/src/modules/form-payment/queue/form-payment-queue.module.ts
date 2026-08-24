import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { FormPaymentQueueProcessor } from './form-payment-queue.processor';
import { FormPaymentServiceModule } from '../service/form-payment.service.module';
import { FileServiceModule } from '../../file/service/file.service.module';

@Module({
  imports: [
    FormPaymentServiceModule,
    forwardRef(() => FileServiceModule),
    BullModule.registerQueue({ name: JobQueueName.FORM_PAYMENT_QUEUE }),
  ],
  providers: [FormPaymentQueueProcessor],
})
export class FormPaymentQueueModule {}
