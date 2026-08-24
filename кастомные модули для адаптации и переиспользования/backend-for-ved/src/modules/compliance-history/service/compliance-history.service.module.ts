import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplianceHistoryService } from './compliance-history.service';
import { GenerateReportsService } from './additional/generate-reports.service';
import { Organization, OrganizationSchema } from '../../organization/service/organization.schema';
import { FormPayment, FormPaymentSchema } from '../../form-payment/service/form-payment.schema';
import {
  FormPaymentStatusSchema,
  FormPaymentStatusSchemaFactory,
} from '../../form-payment/service/history/form-payment-status.schema';
import { CounterpartyServiceModule } from '../../counterparty/service/counterparty.service.module';

@Module({
  imports: [
    CounterpartyServiceModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: FormPayment.name, schema: FormPaymentSchema },
      { name: FormPaymentStatusSchema.name, schema: FormPaymentStatusSchemaFactory },
    ]),
  ],
  providers: [ComplianceHistoryService, GenerateReportsService],
  exports: [ComplianceHistoryService, GenerateReportsService],
})
export class ComplianceHistoryServiceModule {}
