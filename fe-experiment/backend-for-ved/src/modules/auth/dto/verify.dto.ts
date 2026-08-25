import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IAuthVerify } from 'lib/interfaces/models/auth.interface';

export class AuthVerifyDto implements IAuthVerify {
  @IsString()
  @ApiProperty()
  @IsOptional()
  accessToken: string = null;

  @IsString()
  @ApiProperty()
  @IsOptional()
  refreshToken: string = null;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  userAgent: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  ip: string;
}
