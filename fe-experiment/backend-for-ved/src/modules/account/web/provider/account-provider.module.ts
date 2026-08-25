import { Module } from '@nestjs/common';
import { AccountProviderController } from './account-provider.controller';
import { AccountServiceModule } from '../../service/account.service.module';

@Module({
  imports: [AccountServiceModule],
  controllers: [AccountProviderController],
})
export class AccountProviderModule {}
