import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from 'lib/services/base/base.service.interface';
import { IComment, ICommentBase } from 'lib/interfaces/models/comment.interface';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { SocketMessageAction } from '../../../lib/enums/models/socket.enum';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { CommentKind } from 'lib/enums/models/comment.enums';

export interface ICommentService
  extends IBaseService<IComment, ICommentQuery, IBaseOptions, ICommentCreate, ICommentUpdate> {
  findForUser(findData: ICommentByUserQuery, paginateOptions?: IPaginateOptions): Promise<IPaginateResult<IComment>>;
  findUnreadForUser(accountId: string): Promise<IComment[]>;
  update(findData: ICommentQuery, updateData: ICommentUpdate): Promise<IComment>;
  create(createData: ICommentCreate): Promise<IComment>;
  deleteOne(findData: ICommentQuery): Promise<void>;
  markAsRead(data: ICommentMarkAsRead): Promise<void>;
  findEntitiesIdsByUnreadComments(data: IEntitiesIdsByUnreadCommentsQuery): Promise<string[]>;
  sendCommentNotification(comment: IComment, action: SocketMessageAction): Promise<void>;
}

export interface ICommentQuery extends IBaseQuery, Partial<IComment> {
  readByNe?: string;
  accountNe?: string;
  entities?: string[];
}

export interface ICommentByUserQuery {
  entity: string;
  account: string;
}

export interface ICommentCreate extends Pick<ICommentBase, 'entityType' | 'entity' | 'text' | 'kind'> {
  account: string;
  addFiles?: string[];
  removeFiles?: string[];
}

export interface ICommentUpdate extends Pick<UpdatePartial<IComment>, 'text' | 'kind' | 'entityAccount' | 'account'> {
  addFiles?: string[];
  removeFiles?: string[];
}

export interface ICommentMarkAsRead extends Pick<ICommentBase, 'entity' | 'kind'> {
  account: string;
}

export interface IEntitiesIdsByUnreadCommentsQuery extends Pick<ICommentBase, 'entityType'> {
  account: IAccount;
  kind: CommentKind[];
  entityAccount?: IAccount;
}
