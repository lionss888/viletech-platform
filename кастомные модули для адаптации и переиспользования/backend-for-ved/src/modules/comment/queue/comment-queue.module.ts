import { Module } from '@nestjs/common';
import { CommentServiceModule } from '../service/comment.service.module';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { CommentQueueProcessor } from './comment-queue.processor';

@Module({
  imports: [CommentServiceModule, BullModule.registerQueue({ name: JobQueueName.COMMENT_QUEUE })],
  providers: [CommentQueueProcessor],
})
export class CommentQueueModule {}
