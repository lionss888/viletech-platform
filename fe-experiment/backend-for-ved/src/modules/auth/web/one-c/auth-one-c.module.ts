import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthServiceModule } from '../../service/auth.service.module';
import { AuthOneCController } from './auth-one-c.controller';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { GUARD_SERVICE } from 'config';

@Module({
  imports: [NatsModule(GUARD_SERVICE), PassportModule, AuthServiceModule],
  controllers: [AuthOneCController],
})
export class AuthOneCModule {}
