import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterpartyService } from './counterparty.service';
import { CounterpartyFormPaymentHookService } from './counterparty-form-payment-hook.service';
import { Counterparty, CounterpartySchema } from './counterparty.schema';
import { FormPayment, FormPaymentSchema } from '../../form-payment/service/form-payment.schema';
import { CounterpartyReportsService } from './counterparty-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Counterparty.name, schema: CounterpartySchema },
      { name: FormPayment.name, schema: FormPaymentSchema },
    ]),
  ],
  providers: [CounterpartyService, CounterpartyFormPaymentHookService, CounterpartyReportsService],
  exports: [CounterpartyService, CounterpartyFormPaymentHookService, CounterpartyReportsService],
})
export class CounterpartyServiceModule {}
