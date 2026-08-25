import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IBasePaginateOptions, IPaginateOptions } from '../interfaces/paginate.interface';
import { BaseOptionsDto } from './base.options.dto';

export class PaginateDto implements IPaginateOptions {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, default: 10 })
  limit?: number = 10;

  @Type(() => String)
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, default: '-createDate name' })
  sort?: string = '-createDate name';

  @Type(() => String)
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  @Transform(({ value }) => value.split(',').join(' '))
  select?: string;
}

export class BasePaginateOptionsDto
  extends IntersectionType(PaginateDto, BaseOptionsDto)
  implements IBasePaginateOptions {}
