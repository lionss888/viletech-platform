import { Module } from '@nestjs/common';
import { TelegramRpcModule } from './rpc/telegram-rpc.module';

@Module({
  imports: [TelegramRpcModule],
})
export class TelegramModule {}
