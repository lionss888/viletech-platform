import { Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ICommentService } from '../../service/comment.service.interface';
import { UserMethod } from '../../../../lib/decorators/user-method.decorator';
import { CommentCreateByUserDto } from '../../dto/comment.create.dto';
import { CommentKind } from '../../../../lib/enums/models/comment.enums';
import {
  paginateHasNextPlainToClass,
  plainModelToClass,
  queryPaginateParser,
} from '../../../../lib/utils/helpers/entity.helper';
import { CommentDto } from '../../../../lib/dto/models/comment.dto';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { CommentMarkAsReadByUserDto, CommentUpdateByUserDto } from '../../dto/comment.update.dto';
import {
  CommentSitePaginateDto,
  CommentSiteQueryDto,
  EntitiesByUnreadCommentsQueryDto,
} from '../../dto/comment.query.dto';
import { AccountId } from '../../../../lib/decorators/account-id.decorator';
import { IPaginateHasNextResult } from '../../../../lib/interfaces/paginate.interface';
import { ApiForbiddenMessagesResponse } from '../../../../lib/decorators/api-forbidden-messages-response.decorator';
import { COMMENT_SERVICE } from '../../comment.constants';
import { Request } from 'express';
import { IFormPaymentService } from '../../../form-payment/service/form-payment.service.interface';
import { FORM_PAYMENT_SERVICE } from '../../../form-payment/form-payment.constants';
import { forwardRef } from '@nestjs/common';

@ApiCookieAuth()
@ApiTags('comment')
@Controller('comment')
export class CommentSiteController {
  constructor(
    @Inject(COMMENT_SERVICE) private service: ICommentService,
    @Inject(forwardRef(() => FORM_PAYMENT_SERVICE)) private readonly formPaymentService: IFormPaymentService,
  ) {}

  @Get()
  @ApiForbiddenMessagesResponse(['Viewing comments for other users entities is restricted'])
  @UserMethod({ summary: 'Возвращает external комментарии', hasNextPaginate: CommentDto })
  async findWithPaginate(
    @AccountId() accountId: string,
    @Query() dto: CommentSitePaginateDto,
  ): Promise<IPaginateHasNextResult<CommentDto>> {
    const { paginate, model } = queryPaginateParser(dto, CommentSiteQueryDto);
    const result = await this.service.findForUser({ ...model, account: accountId }, paginate);
    return paginateHasNextPlainToClass(CommentDto, result);
  }

  @Get('unread')
  @UserMethod({ summary: 'Возвращает непрочитанные комментарии клиента', response: { status: 200, type: CommentDto } })
  async findUnread(@AccountId() accountId: string) {
    const result = await this.service.findUnreadForUser(accountId);
    return plainModelToClass(CommentDto, result);
  }

  // entitiesIds с непрочитанными комментариями
  @Get('entities-with-unread-comments')
  @UserMethod({
    summary: 'Возвращает id сущностей с непрочитанными комментариями',
    response: { status: 200, type: [String] },
  })
  async findEntitiesIdsWithUnreadComments(@Req() req: Request, @Query() dto: EntitiesByUnreadCommentsQueryDto) {
    return this.service.findEntitiesIdsByUnreadComments({
      ...dto,
      account: req.account,
      entityAccount: req.account,
      kind: [CommentKind.EXTERNAL],
    });
  }

  @Post()
  @UserMethod({ summary: 'Создание комментария клиентом', response: { status: 200, type: CommentDto } })
  async createByUser(@AccountId() accountId: string, @Body() dto: CommentCreateByUserDto): Promise<CommentDto> {
    const comment = await this.service.create({
      ...dto,
      account: accountId,
      kind: CommentKind.EXTERNAL,
    });
    return plainModelToClass(CommentDto, comment);
  }

  @Patch(':_id')
  @UserMethod({ summary: 'Редактирование комментария клиентом', response: { status: 200, type: CommentDto } })
  async patchById(
    @AccountId() accountId: string,
    @Param() idDto: IdFieldDto,
    @Body() updateDto: CommentUpdateByUserDto,
  ): Promise<CommentDto> {
    const comment = await this.service.update(
      {
        _id: idDto._id,
        account: accountId,
      },
      updateDto,
    );
    return plainModelToClass(CommentDto, comment);
  }

  @Put('mark-as-read')
  @ApiForbiddenMessagesResponse(['Marking comments as read for other users entities is restricted'])
  @UserMethod({ summary: 'Пометить комментарии прочитанными' })
  async markAsRead(@AccountId() accountId: string, @Body() dto: CommentMarkAsReadByUserDto) {
    // Проверяем доступ к entity через FormPaymentService
    // Это учитывает доступ через организации (сабаккаунты и владельцы)
    const entityId = typeof dto.entity === 'string' ? dto.entity : dto.entity._id?.toString();
    if (!entityId) {
      throw new ForbiddenException('Marking comments as read for other users entities is restricted');
    }

    try {
      await this.formPaymentService.checkFormPaymentAccess(entityId, accountId);
    } catch (error) {
      throw new ForbiddenException('Marking comments as read for other users entities is restricted');
    }

    await this.service.markAsRead({ ...dto, account: accountId, kind: CommentKind.EXTERNAL });
  }
}
