import { Inject, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { JobQueueName } from 'lib/enums/models/job-queue.enums';
import { ILiquidityService } from '../service/liquidity.service.interface';
import { LiquidityJobQueuePatterns } from 'lib/enums/models/liquidity.enums';
import { ILiquidApply, ILiquidity } from '../../../lib/interfaces/models/liquidity.interface';

@Processor(JobQueueName.LIQUIDITY_JOB_QUEUE)
export class LiquidityQueueProcessor {
  private readonly logger: Logger = new Logger(LiquidityQueueProcessor.name);

  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  // @Process(LiquidityJobQueuePatterns.ORDER_ACCEPTED)
  // async changeLiquidity(job: Job) {
  //   try {
  //     this.logger.log('queue process', job);
  //     await this.service.applyOrderPayment(job.data);
  //   } catch (e) {
  //     this.logger.error(e, e.stack);
  //     throw e;
  //   }
  // }

  @Process({ name: LiquidityJobQueuePatterns.APPLY_LIQUID, concurrency: 1 })
  async applyLiquidity(job: Job<ILiquidApply>) {
    try {
      await this.service.applyLiquid(job.data);
    } catch (e) {
      throw e;
    }
  }

  @Process({ name: LiquidityJobQueuePatterns.APPLY_LIQUID_BATCH, concurrency: 1 })
  async applyLiquidityBatch(job: Job<ILiquidApply[]>) {
    await this.service.applyLiquidsBatch(job.data).catch((e) => {
      this.logger.error(e, e.stack);
      throw e;
    });
  }
}

@Processor(JobQueueName.LIQUIDITY_NOTIFY_JOB_QUEUE)
export class LiquidityNotifyQueueProcessor {
  private readonly logger: Logger = new Logger(LiquidityNotifyQueueProcessor.name);

  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  @Process(LiquidityJobQueuePatterns.SEND_UPDATE_NOTIFICATIONS)
  async handleSendUpdateNotifications(job: Job<ILiquidity>) {
    try {
      await this.service.sendLiquidityUpdateNotifications(job.data);
    } catch (e) {
      this.logger.error(e, e.stack);
      throw e;
    }
  }
}
