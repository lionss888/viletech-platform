import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { ICommentService } from '../../service/comment.service.interface';
import { IComment } from 'lib/interfaces/models/comment.interface';
import { CommentDto } from 'lib/dto/models/comment.dto';
import { CommentMarkAsReadByProviderDto, CommentUpdateByProviderDto } from 'modules/comment/dto/comment.update.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { ProviderMethod } from 'lib/decorators/provider-method.decorator';
import { CommentKind } from 'lib/enums/models/comment.enums';
import {
  CommentAdminQueryDto,
  CommentProviderPaginateDto,
  EntitiesByUnreadCommentsQueryDto,
} from 'modules/comment/dto/comment.query.dto';
import { CommentCreateByProviderDto } from 'modules/comment/dto/comment.create.dto';
import { COMMENT_SERVICE } from '../../comment.constants';

@ApiCookieAuth()
@ApiTags('provider comment')
@Controller('provider/comment')
export class CommentProviderController {
  constructor(@Inject(COMMENT_SERVICE) private readonly service: ICommentService) {}

  @Get()
  @ProviderMethod({ hasNextPaginate: CommentDto })
  async findWithPaginate(@Query() dto: CommentProviderPaginateDto): Promise<IPaginateHasNextResult<IComment>> {
    const { paginate, model } = queryPaginateParser({ ...dto, kind: CommentKind.INTERNAL }, CommentAdminQueryDto);
    const result = await this.service.find(model, { ...paginate, include: ['account', 'entity', 'files'] });
    return paginateHasNextPlainToClass(CommentDto, result);
  }

  @Post()
  @ProviderMethod({ response: { status: 200, type: CommentDto } })
  async createByAdmin(@Req() req: Request, @Body() dto: CommentCreateByProviderDto): Promise<IComment> {
    const comment = await this.service.create({ ...dto, account: req.account._id, kind: CommentKind.INTERNAL });
    return plainModelToClass(CommentDto, comment);
  }

  @Patch(':_id')
  @ProviderMethod({
    response: {
      status: HttpStatus.OK,
      description: 'Comment data updated successfully',
      type: CommentDto,
    },
  })
  async patchById(
    @Req() req: Request,
    @Param('_id') id: string,
    @Body() updateDto: CommentUpdateByProviderDto,
  ): Promise<IComment> {
    return await this.service.update({ _id: id, account: req.account._id }, updateDto);
  }

  // Пометить комментарии сущности как прочитанные
  @Put('mark-as-read')
  @ProviderMethod({
    response: {
      status: HttpStatus.OK,
    },
  })
  async markAsRead(@Req() req: Request, @Body() updateDto: CommentMarkAsReadByProviderDto): Promise<void> {
    await this.service.markAsRead({ ...updateDto, account: req.account._id, kind: CommentKind.INTERNAL });
  }

  // entitiesIds с непрочитанными комментариями
  @Get('entities-with-unread-comments')
  @ProviderMethod({
    summary: 'Возвращает id сущностей с непрочитанными комментариями',
    response: { status: 200, type: [String] },
  })
  async findEntitiesIdsWithUnreadComments(@Req() req: Request, @Query() dto: EntitiesByUnreadCommentsQueryDto) {
    return this.service.findEntitiesIdsByUnreadComments({ ...dto, account: req.account, kind: [CommentKind.INTERNAL] });
  }

  @Delete(':_id')
  @ProviderMethod({ response: { status: HttpStatus.NO_CONTENT } })
  async removeOne(@Req() req: Request, @Param('_id') id: string): Promise<void> {
    const comment = await this.service.findOneOrException({ _id: id });

    if (comment.account.toString() !== req.account._id) {
      throw new ForbiddenException('You are not allowed to delete this comment');
    }

    return this.service.deleteOne({ _id: id });
  }
}
