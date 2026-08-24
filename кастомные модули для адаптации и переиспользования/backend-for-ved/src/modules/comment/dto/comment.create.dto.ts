import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { ICommentCreate } from '../service/comment.service.interface';
import { CommentEntityType, CommentKind } from 'lib/enums/models/comment.enums';
import { ApiProperty } from '@nestjs/swagger';

export class CommentCreateByUserDto implements Omit<ICommentCreate, 'kind'> {
  @ApiProperty({ required: true, enum: CommentEntityType })
  @IsEnum(CommentEntityType)
  entityType: CommentEntityType;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  entity: string;

  @ApiProperty({ required: true })
  @Type(() => String)
  @IsNotEmpty()
  text: string;

  account: string;
}

export class CommentCreateByProviderDto extends CommentCreateByUserDto {
  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'comment must contain no more than 5 files' })
  @Type(() => String)
  @IsMongoId({ each: true })
  addFiles?: string[];
}

export class CommentCreateByManagerDto extends CommentCreateByUserDto implements ICommentCreate {
  @ApiProperty({ required: true, enum: CommentKind })
  @IsNotEmpty()
  @IsEnum(CommentKind)
  kind: CommentKind;

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'comment must contain no more than 5 files' })
  @Type(() => String)
  @IsMongoId({ each: true })
  addFiles?: string[];
}
