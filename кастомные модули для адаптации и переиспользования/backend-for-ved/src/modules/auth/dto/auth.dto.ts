import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountDto } from 'lib/dto/models/account.dto';
import { IAuth } from 'lib/interfaces/models/auth.interface';

export class AuthDto implements IAuth {
  @IsNotEmpty()
  @ApiProperty()
  account: AccountDto;

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
}
