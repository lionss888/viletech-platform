import { ArrayMaxSize, IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ICommentUpdate } from '../service/comment.service.interface';
import { CommentKind } from 'lib/enums/models/comment.enums';
import { CommentBaseDto } from 'lib/dto/models/comment.dto';
import { Type } from 'class-transformer';

export class CommentUpdateByUserDto implements ICommentUpdate {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CommentUpdateByProviderDto extends CommentUpdateByUserDto {
  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Type(() => String)
  @IsMongoId({ each: true })
  addFiles?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeFiles?: string[];
}

export class CommentUpdateByManagerDto implements ICommentUpdate {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

  @ApiProperty({ required: false, enum: CommentKind })
  @IsOptional()
  @IsEnum(CommentKind)
  kind?: CommentKind;

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Type(() => String)
  @IsMongoId({ each: true })
  addFiles?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeFiles?: string[];
}

export class CommentMarkAsReadByManagerDto extends PickType(CommentBaseDto, ['entity', 'kind']) {}
export class CommentMarkAsReadByProviderDto extends PickType(CommentBaseDto, ['entity']) {}
export class CommentMarkAsReadByUserDto extends PickType(CommentBaseDto, ['entity']) {}
