import { Module } from '@nestjs/common';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';
import { FormPaymentInternalComplianceOfficerController } from './form-payment-internal-compliance-officer.controller';

@Module({
  imports: [FormPaymentServiceModule],
  controllers: [FormPaymentInternalComplianceOfficerController],
})
export class FormPaymentInternalComplianceOfficerModule {}
