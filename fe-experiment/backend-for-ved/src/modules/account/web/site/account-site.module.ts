import { Module } from '@nestjs/common';
import { AccountServiceModule } from '../../service/account.service.module';
import { AccountSiteController } from './account-site.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PassportModule, JwtModule.register({}), AccountServiceModule],
  controllers: [AccountSiteController],
})
export class AccountSiteModule {}
