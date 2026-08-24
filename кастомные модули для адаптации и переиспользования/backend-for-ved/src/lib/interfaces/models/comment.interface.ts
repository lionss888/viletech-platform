import { ISchema } from 'lib/interfaces/schema.interface';
import { CommentEntityType, CommentKind } from 'lib/enums/models/comment.enums';
import { IFormPayment } from './form-payment.interface';
import { IAccountShort } from './account.interface';
import { Types } from 'mongoose';
import { IFile } from './file.interface';

export interface ICommentBase {
  entityType: CommentEntityType;
  entity: string | IFormPayment;
  entityAccount?: string | IAccountShort;
  account: string | IAccountShort;
  text: string;
  readBy: Types.ObjectId[];
  kind: CommentKind;
  editedAt?: Date;
  files?: string[] | IFile[];
}

export interface IComment extends ISchema, ICommentBase {}
