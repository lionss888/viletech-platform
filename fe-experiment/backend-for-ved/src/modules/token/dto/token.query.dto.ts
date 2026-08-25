import { IsOptional, IsString } from 'class-validator';
import { ITokenQuery } from '../service/token.service.interface';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { AccountDto } from 'lib/dto/models/account.dto';

export class TokenQueryDto extends IdFieldQueryDto implements ITokenQuery {
  @IsOptional()
  account?: AccountDto;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
