import { SocketMessageAction } from '../../../lib/enums/models/socket.enum';
import { IComment } from '../../../lib/interfaces/models/comment.interface';
import { Job } from 'bull';

export interface ICommentQueueProcessor {
  handleSendCommentNotification(job: Job<ICommentSendNotificationJobData>): Promise<void>;
}

export interface ICommentSendNotificationJobData {
  action: SocketMessageAction;
  comment: IComment;
}

export type ICommentQueueData = ICommentSendNotificationJobData;
