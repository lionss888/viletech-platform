import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IAuthToken } from '../service/auth.service.interface';

export class TokenDto implements IAuthToken {
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @ApiProperty()
  token: string;
}
