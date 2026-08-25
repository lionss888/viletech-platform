import { IsEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @IsString()
  @MinLength(7)
  @IsEmpty()
  @ApiProperty()
  oldPassword: string;

  @IsString()
  @MinLength(7)
  @IsEmpty()
  @ApiProperty()
  newPassword: string;
}
