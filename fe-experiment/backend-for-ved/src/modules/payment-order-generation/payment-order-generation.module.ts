import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentOrderGenerationService } from './service/payment-order-generation.service';
import { FormPayment, FormPaymentSchema } from '../form-payment/service/form-payment.schema';
import { FileServiceModule } from '../file/service/file.service.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: FormPayment.name, schema: FormPaymentSchema }]),
    FileServiceModule
  ],
  providers: [PaymentOrderGenerationService],
  exports: [PaymentOrderGenerationService]
})
export class PaymentOrderGenerationModule {}
