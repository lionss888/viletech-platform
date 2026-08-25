import { Module } from '@nestjs/common';
import { AccountServiceModule } from '../../service/account.service.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AccountAdminController } from './account-admin.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), AccountServiceModule],
  controllers: [AccountAdminController],
})
export class AccountAdminModule {}
