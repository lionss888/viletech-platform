import { Module } from '@nestjs/common';
import { FormPaymentAdminController } from './form-payment-admin.controller';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentAdminController],
})
export class FormPaymentAdminModule {}
