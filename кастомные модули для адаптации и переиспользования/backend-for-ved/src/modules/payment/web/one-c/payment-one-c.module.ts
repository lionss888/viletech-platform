import { Module } from '@nestjs/common';
import { PaymentOneCController } from './payment-one-c.controller';
import { PaymentServiceModule } from '../../service/payment.service.module';

@Module({
  controllers: [PaymentOneCController],
  imports: [PaymentServiceModule],
})
export class PaymentOneCModule {}
