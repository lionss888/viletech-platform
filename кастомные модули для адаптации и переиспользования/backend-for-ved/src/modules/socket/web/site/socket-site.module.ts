import { Module } from '@nestjs/common';
import { SocketSiteController } from './socket-site.controller';
import { SocketServiceModule } from '../../service/socket.service.module';

@Module({
  controllers: [SocketSiteController],
  imports: [SocketServiceModule],
})
export class SocketSiteModule {}
