import { Module } from '@nestjs/common';
import { VirtualAccountService } from './virtual-account.service';
import { ReservedDealService } from './reserved-deal.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VirtualAccount, VirtualAccountSchema } from './virtual-account.schema';
import { ReservedDeal, ReservedDealSchema } from './reserved-deal.schema';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { VIRTUAL_ACCOUNT_CLIENT } from '../virtual-account.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VirtualAccount.name, schema: VirtualAccountSchema },
      { name: ReservedDeal.name, schema: ReservedDealSchema },
    ]),
    NatsModule(VIRTUAL_ACCOUNT_CLIENT),
  ],
  providers: [
    { provide: 'IVirtualAccountService', useClass: VirtualAccountService },
    { provide: 'IReservedDealService', useClass: ReservedDealService },
  ],
  exports: ['IVirtualAccountService', 'IReservedDealService'],
})
export class VirtualAccountServiceModule {}
