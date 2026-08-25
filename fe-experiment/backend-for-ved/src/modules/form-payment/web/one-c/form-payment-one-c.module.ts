import { Module } from '@nestjs/common';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';
import { FormPaymentOneCController } from './form-payment-one-c.controller';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentOneCController],
})
export class FormPaymentOneCModule {}
