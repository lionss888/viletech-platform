import { Module } from '@nestjs/common';
import { FormPaymentComplianceOfficerController } from './form-payment-compliance-officer.controller';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentComplianceOfficerController],
})
export class FormPaymentComplianceOfficerModule {}
