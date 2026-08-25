import { Module } from '@nestjs/common';
import { AccountService } from 'modules/account/service/account.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from 'modules/account/service/account.schema';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { ACCOUNT_CLIENT } from '../account.constants';
import { VirtualAccountServiceModule } from '../../virtual-account/service/virtual-account.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    NatsModule(ACCOUNT_CLIENT),
    VirtualAccountServiceModule,
  ],
  providers: [{ provide: 'IAccountService', useClass: AccountService }],
  exports: [{ provide: 'IAccountService', useClass: AccountService }],
})
export class AccountServiceModule {}
