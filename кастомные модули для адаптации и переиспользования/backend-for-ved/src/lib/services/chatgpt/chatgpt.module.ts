import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CHATGPT_SERVICE } from './chatgpt.service.interface';
import { ChatGptService } from './chatgpt.service';
import { JobQueueName } from '../../enums/models/job-queue.enums';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: JobQueueName.CHATGPT_QUEUE,
    }),
  ],
  providers: [{ provide: CHATGPT_SERVICE, useClass: ChatGptService }],
  exports: [{ provide: CHATGPT_SERVICE, useClass: ChatGptService }],
})
export class ChatGptModule {}
