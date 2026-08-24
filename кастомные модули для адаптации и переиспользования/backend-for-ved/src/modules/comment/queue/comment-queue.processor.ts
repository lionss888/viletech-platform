import { Process, Processor } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { Inject, Logger } from '@nestjs/common';
import { COMMENT_SERVICE } from '../comment.constants';
import { ICommentService } from '../service/comment.service.interface';
import { CommentPattern } from '../../../lib/enums/models/comment.enums';
import { Job } from 'bull';
import { ICommentQueueProcessor, ICommentSendNotificationJobData } from './comment-queue.processor.interface';

@Processor(JobQueueName.COMMENT_QUEUE)
export class CommentQueueProcessor implements ICommentQueueProcessor {
  private readonly logger = new Logger(CommentQueueProcessor.name);

  constructor(@Inject(COMMENT_SERVICE) private readonly service: ICommentService) {}

  @Process(CommentPattern.SEND_NOTIFICATION)
  async handleSendCommentNotification(job: Job<ICommentSendNotificationJobData>): Promise<void> {
    try {
      await this.service.sendCommentNotification(job.data.comment, job.data.action);
    } catch (e) {
      this.logger.error(e, e.stack);
    }
  }
}
