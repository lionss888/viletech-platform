import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { TreasurerTask, TreasurerTaskSchema } from './treasurer-task.schema';
import { TREASURER_TASK_SERVICE } from '../treasurer-task.constants';
import { TreasurerTaskService } from './treasurer-task.service';
import { FormPayment, FormPaymentSchema } from '../../form-payment/service/form-payment.schema';
import { FileServiceModule } from '../../file/service/file.service.module';
import { S3ServiceModule } from '../../../lib/modules/s3/s3.service.module';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { FILE_CLIENT } from '../../file/file.constants';
import { AGENT_CLIENT } from '../../agent/agent.constants';
import { CONTRACT_CLIENT } from '../../contract/contract.constants';
import { FORM_PAYMENT_CLIENT } from '../../form-payment/form-payment.constants';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TreasurerTask.name, schema: TreasurerTaskSchema },
      { name: FormPayment.name, schema: FormPaymentSchema },
    ]),
    forwardRef(() => FileServiceModule),
    S3ServiceModule,
    NatsModule(FILE_CLIENT),
    NatsModule(AGENT_CLIENT),
    NatsModule(CONTRACT_CLIENT),
    NatsModule(FORM_PAYMENT_CLIENT),
    BullModule.registerQueue({ name: JobQueueName.FORM_PAYMENT_QUEUE }),
  ],
  providers: [{ provide: TREASURER_TASK_SERVICE, useClass: TreasurerTaskService }],
  exports: [{ provide: TREASURER_TASK_SERVICE, useClass: TreasurerTaskService }],
})
export class TreasurerTaskServiceModule {}
