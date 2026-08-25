import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ITemporaryToken } from '../service/auth.service.interface';

export class TemporaryTokenDto implements ITemporaryToken {
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @ApiProperty()
  token: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsNotEmpty()
  ip: string;
}
