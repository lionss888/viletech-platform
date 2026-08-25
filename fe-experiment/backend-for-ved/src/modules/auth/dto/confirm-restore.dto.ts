import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IRestoreConfirm } from '../service/auth.service.interface';
import { EmailFieldDto } from 'lib/dto/email-field.dto';
import { PasswordFieldDto } from 'lib/dto/password-field.dto';

export class ConfirmRestoreDto extends IntersectionType(EmailFieldDto, PasswordFieldDto) implements IRestoreConfirm {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @ApiProperty()
  password: string;
}
