import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IPasswordField, IPasswordFieldOption } from '../interfaces/password-field.interface';

export class PasswordFieldDto implements IPasswordField {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(50)
  @ApiProperty()
  password: string;
}

export class PasswordFieldOptionDto implements IPasswordFieldOption {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(7)
  password?: string;
}
