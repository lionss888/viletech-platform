import { Module } from '@nestjs/common';
import { FormPaymentRpcController } from './form-payment-rpc.controller';
import { FormPaymentServiceModule } from '../service/form-payment.service.module';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentRpcController],
})
export class FormPaymentRpcModule {}
