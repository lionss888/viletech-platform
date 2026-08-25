import { Module } from '@nestjs/common';
import { MailRpcModule } from './rpc/mail-rpc.module';

@Module({
  imports: [MailRpcModule],
})
export class MailModule {}
