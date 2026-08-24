import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNotEmptyObject, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDto } from 'lib/dto/base.dto';
import { AccountDto } from 'lib/dto/models/account.dto';
import { IToken, ITokenBase } from 'lib/interfaces/models/token.interface';

export class TokenBaseDto implements ITokenBase {
  @ApiProperty({ type: AccountDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AccountDto)
  account: AccountDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  userAgent: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  ip: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  expires: Date;
}

export class TokenDto extends IntersectionType(BaseDto, TokenBaseDto) implements IToken {}
