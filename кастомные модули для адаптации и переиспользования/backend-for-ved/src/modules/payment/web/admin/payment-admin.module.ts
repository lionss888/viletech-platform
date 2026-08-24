import { Module } from '@nestjs/common';
import { PaymentAdminController } from './payment-admin.controller';
import { PaymentServiceModule } from '../../service/payment.service.module';

@Module({
  imports: [PaymentServiceModule],
  controllers: [PaymentAdminController],
})
export class PaymentAdminModule {}
