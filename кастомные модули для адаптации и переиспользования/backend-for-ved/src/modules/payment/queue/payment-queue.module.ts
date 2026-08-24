import { Module } from '@nestjs/common';
import { PaymentQueueProcessor } from './payment-queue.processor';
import { PaymentServiceModule } from '../service/payment.service.module';

@Module({
  providers: [PaymentQueueProcessor],
  imports: [PaymentServiceModule],
})
export class PaymentQueueModule {}
