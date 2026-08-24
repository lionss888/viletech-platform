import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Liquidity, LiquiditySchema } from './liquidity.schema';
import { LiquidityService } from './liquidity.service';
import { LIQUIDITY_CLIENT } from '../liquidity.contants';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { OpexSModule } from '../../../lib/services/currency/opex/opex.service.module';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { Organization, OrganizationSchema } from '../../organization/service/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Liquidity.name, schema: LiquiditySchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    NatsModule(LIQUIDITY_CLIENT),
    OpexSModule,
    BullModule.registerQueue({ name: JobQueueName.LIQUIDITY_NOTIFY_JOB_QUEUE }),
  ],
  providers: [{ provide: 'ILiquidityService', useClass: LiquidityService }],
  exports: [{ provide: 'ILiquidityService', useClass: LiquidityService }],
})
export class LiquidityServiceModule {}
