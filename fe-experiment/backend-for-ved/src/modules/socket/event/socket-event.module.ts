import { Module } from '@nestjs/common';
import { SocketEventController } from './socket-event.controller';
import { SocketServiceModule } from '../service/socket.service.module';

@Module({ imports: [SocketServiceModule], controllers: [SocketEventController] })
export class SocketEventModule {}
