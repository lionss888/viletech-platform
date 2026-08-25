import { Module } from '@nestjs/common';
import { AccountManagerController } from './account-manager.controller';
import { AccountServiceModule } from '../../service/account.service.module';

@Module({
  imports: [AccountServiceModule],
  controllers: [AccountManagerController],
})
export class AccountManagerModule {}
