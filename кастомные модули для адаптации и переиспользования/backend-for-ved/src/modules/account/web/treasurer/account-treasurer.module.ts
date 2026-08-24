import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AccountServiceModule } from '../../service/account.service.module';
import { AccountTreasurerController } from './account-treasurer.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), AccountServiceModule],
  controllers: [AccountTreasurerController],
})
export class AccountTreasurerModule {}

