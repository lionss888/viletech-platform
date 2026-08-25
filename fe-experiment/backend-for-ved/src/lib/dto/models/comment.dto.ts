import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { BaseDto } from '../base.dto';
import { Type } from 'class-transformer';
import { IComment, ICommentBase } from 'lib/interfaces/models/comment.interface';
import { CommentEntityType, CommentKind } from 'lib/enums/models/comment.enums';
import { Types } from 'mongoose';
import { AccountShortDto } from './account.dto';
import { FormPaymentDto } from './form-payment.dto';
import { IFile } from '../../interfaces/models/file.interface';
import { FileDto } from './file.dto';

const mapEntity = {
  [CommentEntityType.FORM_PAYMENT]: FormPaymentDto,
};

type EntityDtoUnion = InstanceType<(typeof mapEntity)[keyof typeof mapEntity]>;

export class CommentBaseDto implements ICommentBase {
  @ApiProperty({ enum: CommentEntityType, description: 'Название сущности к которой привязан комментарий' })
  @IsEnum(CommentEntityType)
  entityType: CommentEntityType;

  @ApiProperty({
    type: String,
    description: 'ID сущности к которой привязан комментарий',
  })
  @ValidateIf((o) => typeof o.entity === 'string')
  @IsMongoId()
  @IsNotEmpty()
  @Type(({ newObject }) => mapEntity[newObject.entityType])
  entity: string | EntityDtoUnion;

  @ApiProperty({
    type: String,
    description: 'ID аккаунта, котороый создал сущность к которой привязан комментарий',
  })
  @IsMongoId()
  @IsOptional()
  @Type(() => String)
  entityAccount?: string;

  @ApiProperty({
    type: AccountShortDto,
    description: 'Пользователь оставивший комментарий',
  })
  @IsMongoId()
  @IsNotEmpty()
  @Type(() => AccountShortDto)
  account: AccountShortDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ enum: CommentKind, description: 'Внутренний или внешний (для клиентов) комментарий' })
  @IsEnum(CommentKind)
  kind: CommentKind;

  @ApiProperty({
    type: [String],
    description: 'Список пользователей прочитавших комментарий',
    required: false,
  })
  @IsArray()
  @IsMongoId({ each: true })
  @Type(() => String)
  readBy: Types.ObjectId[];

  @ApiProperty({
    required: false,
  })
  @Type(() => Date)
  @IsOptional()
  editedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => FileDto)
  files?: IFile[];
}

export class CommentDto extends IntersectionType(CommentBaseDto, BaseDto) implements IComment {}
