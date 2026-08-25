import { Module } from '@nestjs/common';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { SOCKET_ANONYMOUS_SERVICE, SOCKET_AUTHORIZED_SERVICE, SOCKET_CLIENT } from '../socket.constants';
import { SocketAuthorizedService } from './socket-authorized.service';
import { BullModule } from '@nestjs/bull';
import { SocketAnonymousService } from './socket-anonymous.service';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('tokens.secret'),
      }),
    }),
    NatsModule(SOCKET_CLIENT),
    BullModule.registerQueue({
      name: JobQueueName.SOCKET_QUEUE,
    }),
  ],
  providers: [
    { provide: SOCKET_AUTHORIZED_SERVICE, useClass: SocketAuthorizedService },
    { provide: SOCKET_ANONYMOUS_SERVICE, useClass: SocketAnonymousService },
  ],
  exports: [
    { provide: SOCKET_AUTHORIZED_SERVICE, useClass: SocketAuthorizedService },
    { provide: SOCKET_ANONYMOUS_SERVICE, useClass: SocketAnonymousService },
  ],
})
export class SocketServiceModule {}
