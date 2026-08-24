import { Module } from '@nestjs/common';
import { MailRpcController } from './mail-rpc.controller';
import { MailServiceModule } from '../service/mail.service.module';

@Module({
  imports: [MailServiceModule],
  controllers: [MailRpcController],
})
export class MailRpcModule {}
