import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { IAccountOptions } from '../service/account.service.interface';

export class AccountOptionsDto extends BaseOptionsDto implements IAccountOptions {
  @Type(() => String)
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.split(',').join(' '))
  select?: string;
}
