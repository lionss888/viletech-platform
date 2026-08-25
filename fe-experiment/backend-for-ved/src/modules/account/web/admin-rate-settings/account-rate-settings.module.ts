import { Module } from '@nestjs/common';
import { AccountServiceModule } from '../../service/account.service.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AccountRateSettingsController } from './account-rate-settings.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), AccountServiceModule],
  controllers: [AccountRateSettingsController],
})
export class AccountRateSettingsModule {}
