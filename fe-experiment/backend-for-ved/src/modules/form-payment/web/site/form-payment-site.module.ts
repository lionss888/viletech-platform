import { Module } from '@nestjs/common';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';
import { FormPaymentSiteController } from './form-payment-site.controller';
import { OrganizationServiceModule } from '../../../organization/service/organization.service.module';
import { DiadocServiceModule } from '../../../diadoc/service/diadoc.service.module';

@Module({
  imports: [FormPaymentServiceModule, OrganizationServiceModule, DiadocServiceModule], // VF-2: Добавлен DiadocServiceModule
  controllers: [FormPaymentSiteController],
})
export class FormPaymentSiteModule {}
