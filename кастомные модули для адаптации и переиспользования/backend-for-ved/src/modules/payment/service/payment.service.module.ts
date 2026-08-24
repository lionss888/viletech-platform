import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './payment.schema';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { PAYMENT_SERVICE } from '../payment.constants';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    NatsModule(PAYMENT_SERVICE),
    BullModule.registerQueue({ name: JobQueueName.PAYMENT_QUEUE }),
  ],
  providers: [{ provide: PAYMENT_SERVICE, useClass: PaymentService }],
  exports: [{ provide: PAYMENT_SERVICE, useClass: PaymentService }],
})
export class PaymentServiceModule {}
