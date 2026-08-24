import { Module } from '@nestjs/common';
import { FormPaymentProviderController } from './form-payment-provider.controller';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentProviderController],
})
export class FormPaymentProviderModule {}
