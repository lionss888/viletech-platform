import { Module } from '@nestjs/common';
import { PaymentManagerController } from './payment-manager.controller';
import { PaymentServiceModule } from '../../service/payment.service.module';

@Module({
  controllers: [PaymentManagerController],
  imports: [PaymentServiceModule],
})
export class PaymentManagerModule {}
