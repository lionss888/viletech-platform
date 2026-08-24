import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthRPCController } from './auth-rpc.controller';
import { AuthServiceModule } from '../service/auth.service.module';

@Module({
  imports: [PassportModule, AuthServiceModule],
  controllers: [AuthRPCController],
})
export class AuthRPCModule {}
