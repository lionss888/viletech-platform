import { Module } from '@nestjs/common';
import { AccountRPCController } from './account-rpc.controller';
import { AccountServiceModule } from '../service/account.service.module';

@Module({
  imports: [AccountServiceModule],
  controllers: [AccountRPCController],
})
export class AccountRPCModule {}
