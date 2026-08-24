import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IConfirmRegistration, IRegistration } from '../service/auth.service.interface';
import { AccountCreateDto } from '../../account/dto/account.create.dto';
import { EmailFieldDto } from '../../../lib/dto/email-field.dto';

export class RegistrationDto extends AccountCreateDto implements IRegistration {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(50)
  password: string;
}

export class ConfirmRegistrationDto extends EmailFieldDto implements IConfirmRegistration {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty()
  code: string;
}
