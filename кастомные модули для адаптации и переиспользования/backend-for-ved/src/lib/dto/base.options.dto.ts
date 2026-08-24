import { IBaseOptions } from '../services/base/base.service.interface';
import { IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BaseOptionsDto implements IBaseOptions {
  @IsOptional()
  @IsString({ each: true })
  include?: string[];

  @Type(() => String)
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  @Transform(({ value }) => value.split(',').join(' '))
  select?: string;
}
