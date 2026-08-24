import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IEmailField, IEmailFieldOptional } from 'lib/interfaces/email-field.interface';

export class EmailFieldDto implements IEmailField {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;
}

export class EmailFieldOptionalDto implements IEmailFieldOptional {
  @IsEmail()
  @IsOptional()
  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.toLowerCase())
  email?: string;
}
