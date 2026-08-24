import { Module } from '@nestjs/common';
import { SocketRpcController } from './socket-rpc.controller';
import { SocketServiceModule } from '../service/socket.service.module';

@Module({ imports: [SocketServiceModule], controllers: [SocketRpcController] })
export class SocketRpcModule {}
