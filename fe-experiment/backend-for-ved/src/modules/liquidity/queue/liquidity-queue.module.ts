import { Module } from '@nestjs/common';
import { LiquidityNotifyQueueProcessor, LiquidityQueueProcessor } from './liquidity-queue.processor';
import { LiquidityServiceModule } from '../service/liquidity.service.module';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';

@Module({
  imports: [
    LiquidityServiceModule,
    BullModule.registerQueue({ name: JobQueueName.LIQUIDITY_JOB_QUEUE }),
    BullModule.registerQueue({ name: JobQueueName.LIQUIDITY_NOTIFY_JOB_QUEUE }),
  ],
  providers: [LiquidityQueueProcessor, LiquidityNotifyQueueProcessor],
})
export class LiquidityQueueModule {}
