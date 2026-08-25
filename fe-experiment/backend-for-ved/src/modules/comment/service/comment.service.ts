import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, PopulateOptions, UpdateQuery } from 'mongoose';
import _ from 'lodash';
import {
  ICommentByUserQuery,
  ICommentCreate,
  ICommentMarkAsRead,
  ICommentQuery,
  ICommentService,
  ICommentUpdate,
  IEntitiesIdsByUnreadCommentsQuery,
} from './comment.service.interface';
import { BaseService } from 'lib/services/base/base.service';
import { Comment } from './comment.schema';
import { IComment } from 'lib/interfaces/models/comment.interface';
import { CommentKind, CommentPattern } from 'lib/enums/models/comment.enums';
import { AccountPattern, AccountRole } from 'lib/enums/models/account.enums';
import { SenderFormPaymentEvents, SenderPattern, SenderTelegramPattern } from 'lib/enums/models/sender.enums';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { removeFieldInclude } from 'lib/utils/helpers/populate-options.helper';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentPattern } from '../../../lib/enums/models/form-payment.enums';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from '../../../lib/enums/models/socket.enum';
import { ISocketMessage, ISocketMessageData } from '../../../lib/interfaces/models/socket.interface';
import { getIdFromAccount } from '../../../lib/utils/helpers/entity.helper';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { InjectQueue } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { Queue } from 'bull';
import { ICommentQueueData } from '../queue/comment-queue.processor.interface';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { FilePattern } from '../../../lib/enums/models/file.enums';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IOrganizationService } from '../../organization/service/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../../organization/organization.constants';
import { OrganizationSubaccountStatusType } from '../../../lib/enums/models/organization.enums';

@Injectable()
export class CommentService
  extends BaseService<IComment, Comment, ICommentQuery, IBaseOptions, ICommentCreate, ICommentUpdate>
  implements ICommentService
{
  private readonly logger: Logger = new Logger(CommentService.name);

  constructor(
    @InjectModel(Comment.name) readonly model: PaginateModel<Comment>,
    @InjectNats() readonly client: NatsClientProxy,
    @InjectQueue(JobQueueName.COMMENT_QUEUE) private commentQueue: Queue<ICommentQueueData>,
    @Inject(forwardRef(() => FORM_PAYMENT_SERVICE)) private readonly formPaymentService: IFormPaymentService,
    @Inject(ORGANIZATION_SERVICE) private readonly organizationService: IOrganizationService,
  ) {
    super();
  }

  async findForUser(
    { account, ...findData }: ICommentByUserQuery,
    paginateOptions?: IPaginateOptions,
  ): Promise<IPaginateResult<IComment>> {
    // Проверяем доступ к entity через FormPaymentService
    // Это учитывает доступ через организации (сабаккаунты и владельцы)
    try {
      await this.formPaymentService.checkFormPaymentAccess(findData.entity, account);
    } catch (error) {
      throw new ForbiddenException('Viewing comments for other users entities is restricted');
    }

    return await super.find(
      { ...findData, kind: CommentKind.EXTERNAL },
      { ...paginateOptions, include: ['account', 'entity'] },
    );
  }

  async findUnreadForUser(accountId: string): Promise<IComment[]> {
    // Используем buildQueryWithOrganizationAccess для получения запроса с учетом доступа через организации
    const query = await this.formPaymentService.buildQueryWithOrganizationAccess({}, accountId);

    const forms = await this.client.send<Pick<IFormPayment, '_id'>[]>(FormPaymentPattern.FIND_MANY, {
      query,
      options: {
        select: '_id',
      },
    });

    return await super.findMany(
      {
        accountNe: accountId,
        readByNe: accountId,
        entities: forms.map(({ _id }) => _id),
        kind: CommentKind.EXTERNAL,
      },
      { include: ['account', 'entity'] },
    );
  }

  // Получаем entitiesIds в которых есть непрочитанные пользователем комментарии
  async findEntitiesIdsByUnreadComments(data: IEntitiesIdsByUnreadCommentsQuery): Promise<string[]> {
    const entities = await this.model.distinct('entity', {
      entityType: data.entityType,
      readBy: { $ne: data.account._id },
      account: { $ne: data.account._id },
      kind: { $in: data.kind },
      ...(data.entityAccount ? { entityAccount: data.entityAccount._id } : {}),
    });

    return _.map(entities, (entity) => entity.toString());
  }

  async update(findData: ICommentQuery, updateDto: ICommentUpdate): Promise<IComment> {
    const comment = await super.findOneOrException(findData);

    const updateData = { ...updateDto };

    if (updateDto.text && comment.text !== updateData.text) {
      _.set(updateData, 'editedAt', new Date());
    }

    if (
      comment.kind === CommentKind.INTERNAL &&
      Boolean(updateData.addFiles?.length || updateData.removeFiles?.length)
    ) {
      if (updateData.addFiles?.length) {
        updateData.addFiles = await this.retrieveExistedFiles(updateData.addFiles, (file) =>
          (comment?.files as string[])?.includes(file),
        );
      }
      if (updateData.removeFiles?.length) {
        updateData.removeFiles = await this.retrieveExistedFiles(updateData.removeFiles);
      }

      if ((comment.files?.length || 0) + (updateData.addFiles?.length || 0) - (updateData.removeFiles?.length || 0) > 5)
        throw new BadRequestException('comment must contain no more than 5 files');
    }

    const updatedComment = await super.updateOne(findData, updateData, { include: ['account'] });

    await this.commentQueue.add(CommentPattern.SEND_NOTIFICATION, {
      action: SocketMessageAction.UPDATE,
      comment: updatedComment,
    });

    return updatedComment;
  }

  async markAsRead(data: ICommentMarkAsRead): Promise<void> {
    const findData = { entity: data.entity, kind: data.kind, readByNe: data.account, accountNe: data.account };

    await super.updateMany(findData, { account: data.account });

    const updatedComments = await super.findMany(findData);

    for (const comment of updatedComments) {
      await this.commentQueue.add(CommentPattern.SEND_NOTIFICATION, {
        action: SocketMessageAction.UPDATE,
        comment,
      });
    }
  }

  async create(data: ICommentCreate): Promise<IComment> {
    const createdComment = await super.create(data, { include: ['account', 'entity'] });

    let updateData = {};

    if (_.has(createdComment.entity, 'account')) {
      updateData = { ...updateData, entityAccount: _.get(createdComment, 'entity.account') };
    }

    if (createdComment.kind === CommentKind.INTERNAL && data.addFiles?.length) {
      updateData = { ...updateData, addFiles: await this.retrieveExistedFiles(data.addFiles) };
    }

    if (!_.isEmpty(updateData)) {
      await super.updateOne(createdComment, updateData);
    }

    if (createdComment.kind === CommentKind.INTERNAL) {
      await this.sendMailInternal(SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED, createdComment);
    }

    await this.commentQueue.add(CommentPattern.SEND_NOTIFICATION, {
      action: SocketMessageAction.CREATE,
      comment: createdComment,
    });

    this.createTelegramEvent(createdComment).catch((err) =>
      this.logger.error(JSON.stringify(err.response?.data || err.message || err)),
    );

    return super.findOneOrException({ _id: createdComment._id }, { include: ['account'] });
  }

  async deleteOne(findData: ICommentQuery): Promise<void> {
    const comment = await super.findOneOrException(findData, { include: ['account', 'entity'] });

    await super.deleteOne(findData);

    await this.commentQueue.add(CommentPattern.SEND_NOTIFICATION, {
      action: SocketMessageAction.DELETE,
      comment,
    });
  }

  private async sendMailInternal(event: SenderFormPaymentEvents, comment: IComment) {
    const managers = await this.client.send(AccountPattern.FIND_MANY, {
      query: {
        roles: [AccountRole.MANAGER, AccountRole.PROVIDER],
      },
      options: {
        select: 'email, -_id',
      },
    });

    const managerEmails = _.without(
      _.map(managers, 'email'),
      _.isObject(comment.account) ? comment.account.email : null,
    );

    const createDateFormatted = comment.createDate.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    if (!_.isEmpty(managerEmails)) {
      await this.client.send(SenderPattern.SEND_ADMINS, {
        type: event,
        managerEmails,
        data: { comment, createDateFormatted },
        language: 'ru',
      });
    }
  }

  private async createTelegramEvent(comment: IComment) {
    const events: SenderFormPaymentEvents[] = [];

    const accountId = typeof comment?.account === 'string' ? comment.account : comment?.account?._id?.toString();

    if (accountId) {
      const account = await this.client.send<Pick<IAccount, 'roles'>>(AccountPattern.FIND_ONE, {
        query: {
          _id: accountId,
        },
        options: {
          select: 'roles',
        },
      });

      if (comment.kind === CommentKind.EXTERNAL) {
        if (account?.roles?.includes(AccountRole.USER)) {
          events.push(SenderFormPaymentEvents.FORM_PAYMENT_EXTERNAL_COMMENT_CREATED);
        }
      }

      if (comment.kind === CommentKind.INTERNAL) {
        if (account?.roles?.includes(AccountRole.MANAGER)) {
          events.push(SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_MANAGER);
        }

        if (account?.roles?.includes(AccountRole.PROVIDER)) {
          events.push(SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_PROVIDER);
        }
      }
    }

    for (const event of events) {
      await this.client.send(SenderTelegramPattern.SEND, {
        event,
        language: 'ru',
        data: {
          comment,
        },
      });
    }
  }

  async sendCommentNotification(comment: IComment, action: SocketMessageAction): Promise<void> {
    let commentWithEntity = comment;

    if (
      typeof commentWithEntity.entity === 'string' ||
      typeof commentWithEntity.account === 'string' ||
      (comment.kind === CommentKind.INTERNAL && !!commentWithEntity?.files?.some((file) => typeof file === 'string'))
    ) {
      const include = ['account', 'entity'];

      if (comment.kind === CommentKind.INTERNAL) include.push('files');

      commentWithEntity = await this.findOneOrException({ _id: comment._id }, { include });
    }

    const managerAccounts = await this.client.send<Pick<IAccount, '_id'>[]>(AccountPattern.FIND_MANY, {
      query: {
        roles: [AccountRole.MANAGER],
      },
      options: {
        select: '_id',
      },
    });

    const notifications: ISocketMessage[] = [];

    const socketMessageData: ISocketMessageData<IComment> = {
      action,
      context: SocketMessageContext.COMMENT,
      payload: comment,
    };

    if (comment.kind === CommentKind.EXTERNAL) {
      // После загрузки с include, entity должен быть объектом IFormPayment, а не строкой
      if (typeof commentWithEntity.entity === 'string') {
        return;
      }

      const formPayment = commentWithEntity.entity;
      const userNotification: ISocketMessage<IComment> = {
        account: getIdFromAccount(formPayment.account),
        data: socketMessageData,
      };

      notifications.push(userNotification);

      // Получаем сабаккаунты организации через новую систему доступа
      const organization = formPayment.organization;
      if (organization) {
        const organizationId = typeof organization === 'string' ? organization : organization.refOrganizationId;
        if (organizationId) {
          const org = await this.organizationService.findOne(
            { _id: organizationId, isActive: true },
            { include: ['subaccounts.account'] },
          );
          if (org?.subaccounts?.length) {
            const activeSubaccounts = org.subaccounts.filter(
              (subaccount) => subaccount.status === OrganizationSubaccountStatusType.ACTIVE,
            );
            for (const subaccount of activeSubaccounts) {
              notifications.push({
                account: getIdFromAccount(subaccount.account),
                data: socketMessageData,
              });
            }
          }
        }
      }
    }

    if (comment.kind === CommentKind.INTERNAL) {
      // После загрузки с include, entity должен быть объектом IFormPayment, а не строкой
      if (typeof commentWithEntity.entity === 'string') {
        return;
      }

      const formPayment = commentWithEntity.entity;
      if (formPayment.provider) {
        const providerNotification: ISocketMessage<IComment> = {
          account: getIdFromAccount(formPayment.provider),
          data: socketMessageData,
        };

        notifications.push(providerNotification);
      }
    }

    const managerNotifications: ISocketMessage<IComment>[] = managerAccounts.map(({ _id }) => ({
      account: _id,
      data: socketMessageData,
    }));

    notifications.push(...managerNotifications);

    await this.client.emit(SocketEventPattern.SEND_MANY, notifications);
  }

  private async retrieveExistedFiles(fileIds: string[], rejectCb?: (fileId: string) => boolean): Promise<string[]> {
    const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
      _ids: fileIds,
    });

    const existedFileIdsChain = _.chain(files).map('_id');

    if (rejectCb) {
      existedFileIdsChain.reject(rejectCb);
    }

    const existedFileIds = existedFileIdsChain.value();

    return _.intersection(fileIds, existedFileIds);
  }

  protected makePopulate(options?: IBaseOptions): PopulateOptions | (PopulateOptions | string)[] {
    const populates = [];

    if (options?.include) {
      if (removeFieldInclude(options, 'account')) {
        populates.push({ path: 'account', select: '_id email fullName' });
      }

      if (removeFieldInclude(options, 'entity')) {
        populates.push('entity');
      }
    }

    return populates;
  }

  protected makeUpdate({ account, addFiles, removeFiles, ...data }: ICommentUpdate & ICommentMarkAsRead) {
    const updateData: UpdateQuery<Comment> & any = {
      $set: { ...data },
      $addToSet: {},
      $push: {},
    };

    if (account) {
      updateData.$push['readBy'] = account;
    }

    if (addFiles?.length) {
      updateData.$addToSet['files'] = addFiles;
    }

    if (removeFiles?.length) {
      updateData.$pull['files'] = { $in: removeFiles };
    }

    return updateData as UpdateQuery<Comment>;
  }

  protected async makeQuery({
    entity,
    entities,
    entityType,
    kind,
    readByNe,
    accountNe,
    ...findData
  }: any): Promise<FilterQuery<Comment>> {
    const query: FilterQuery<Comment> = { ...findData };

    if (entity) {
      query.entity = entity;
    }

    if (entities) {
      query.entity = { $in: entities };
    }

    if (entityType) {
      query.entityType = entityType;
    }

    if (kind) {
      query.kind = kind;
    }

    if (readByNe) {
      query.readBy = { $ne: readByNe };
    }

    if (accountNe) {
      query.account = { $ne: accountNe };
    }

    return query;
  }
}
