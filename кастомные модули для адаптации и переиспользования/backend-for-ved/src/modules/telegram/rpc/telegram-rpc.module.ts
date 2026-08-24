import { Module } from '@nestjs/common';
import { TelegramServiceModule } from '../service/telegram.service.module';
import { TelegramRpcController } from './telegram-rpc.controller';

@Module({
  imports: [TelegramServiceModule],
  controllers: [TelegramRpcController],
})
export class TelegramRpcModule {}
