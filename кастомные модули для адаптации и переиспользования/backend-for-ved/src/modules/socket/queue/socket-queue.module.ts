import { Module } from '@nestjs/common';
import { SocketQueueProcessor } from './socket-queue.processor';
import { SocketServiceModule } from '../service/socket.service.module';

@Module({ imports: [SocketServiceModule], providers: [SocketQueueProcessor] })
export class SocketQueueModule {}
