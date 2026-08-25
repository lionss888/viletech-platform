import { PaginateDto } from 'lib/dto/paginate.dto';
import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { ICommentQuery, IEntitiesIdsByUnreadCommentsQuery } from '../service/comment.service.interface';
import { CommentEntityType, CommentKind } from 'lib/enums/models/comment.enums';
import { IsArray, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CommentAdminQueryDto
  extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto)
  implements ICommentQuery {}

export class CommentManagerPaginateDto
  extends IntersectionType(CommentAdminQueryDto, PaginateDto)
  implements ICommentQuery, IPaginateOptions
{
  @ApiProperty({ enum: CommentEntityType, enumName: 'CommentEntityType', required: false })
  @IsEnum(CommentEntityType)
  @IsOptional()
  entityType?: CommentEntityType;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  entity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @Type(() => String)
  @IsMongoId({ each: true })
  entities?: string[];

  @ApiProperty({ required: false, enum: CommentKind, enumName: 'CommentKind' })
  @IsOptional()
  @IsEnum(CommentKind)
  kind?: CommentKind;
}

export class CommentProviderPaginateDto extends OmitType(CommentManagerPaginateDto, ['kind']) {}

export class CommentSiteQueryDto extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto) implements ICommentQuery {
  @ApiProperty({ enum: CommentEntityType, enumName: 'CommentEntityType', required: false })
  @IsEnum(CommentEntityType)
  @IsOptional()
  entityType?: CommentEntityType;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  entity: string;
}

export class CommentSitePaginateDto
  extends IntersectionType(CommentSiteQueryDto, PaginateDto)
  implements ICommentQuery, IPaginateOptions {}

export class EntitiesByUnreadCommentsQueryDto
  implements Omit<IEntitiesIdsByUnreadCommentsQuery, 'account' | 'kind' | 'entityAccount'>
{
  @ApiProperty({ enum: CommentEntityType, enumName: 'CommentEntityType', required: true })
  @IsEnum(CommentEntityType)
  entityType: CommentEntityType;
}
