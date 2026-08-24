import { Module } from '@nestjs/common';
import { SocketSiteModule } from './web/site/socket-site.module';
import { SocketEventModule } from './event/socket-event.module';
import { SocketRpcModule } from './rpc/socket-rpc.module';
import { SocketQueueModule } from './queue/socket-queue.module';

@Module({
  imports: [SocketSiteModule, SocketRpcModule, SocketEventModule, SocketQueueModule],
})
export class SocketModule {}
