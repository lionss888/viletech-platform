import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthServiceModule } from '../../service/auth.service.module';
import { AuthSiteController } from './auth-site.controller';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { GUARD_SERVICE } from 'config';

@Module({
  imports: [NatsModule(GUARD_SERVICE), PassportModule, AuthServiceModule],
  controllers: [AuthSiteController],
})
export class AuthSiteModule {}
