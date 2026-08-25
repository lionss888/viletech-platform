import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobQueueName } from '../../../enums/models/job-queue.enums';
import { ChatGptQueueProcessor } from './chatgpt-queue.processor';
import { ChatGptModule } from '../chatgpt.module';
import { FormPaymentServiceModule } from '../../../../modules/form-payment/service/form-payment.service.module';
import { SocketServiceModule } from '../../../../modules/socket/service/socket.service.module';
import { FileServiceModule } from '../../../../modules/file/service/file.service.module';

@Module({
  imports: [
    ChatGptModule,
    FormPaymentServiceModule,
    SocketServiceModule,
    FileServiceModule,
    ConfigModule,
    BullModule.registerQueueAsync({
      name: JobQueueName.CHATGPT_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const retryConfig = configService.get('openai.retries');
        const maxAttempts = retryConfig?.maxAttempts || 3;
        const initialDelayMs = retryConfig?.initialDelayMs || 1000;

        return {
          defaultJobOptions: {
            attempts: maxAttempts,
            backoff: {
              type: 'exponential' as const,
              delay: initialDelayMs,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
  ],
  providers: [ChatGptQueueProcessor],
  exports: [ChatGptQueueProcessor],
})
export class ChatGptQueueModule {}
