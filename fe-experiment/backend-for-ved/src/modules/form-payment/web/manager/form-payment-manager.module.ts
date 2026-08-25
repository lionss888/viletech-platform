import { Module } from '@nestjs/common';
import { FormPaymentManagerController } from './form-payment-manager.controller';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';
import { DiadocServiceModule } from '../../../diadoc/service/diadoc.service.module';

@Module({
  imports: [FormPaymentServiceModule, DiadocServiceModule], // VF-2: Добавлен DiadocServiceModule
  controllers: [FormPaymentManagerController],
})
export class FormPaymentManagerModule {}
