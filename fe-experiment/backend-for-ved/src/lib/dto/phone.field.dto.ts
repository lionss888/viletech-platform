import { IPhoneField, IPhoneFieldOptional } from 'lib/interfaces/phone-field.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { IsMobilePhone } from 'lib/utils/validate.utils';

export class PhoneFieldDto implements IPhoneField {
  @ApiProperty({ description: 'Mobile phone number' })
  @IsNotEmpty()
  @Matches(/\+\d{7,19}/, { message: 'Phone must start with a plus' })
  @IsMobilePhone()
  phone: string;
}

export class PhoneFieldOptionalDto implements IPhoneFieldOptional {
  @ApiProperty({ description: 'Mobile phone number', required: false })
  @IsOptional()
  @Matches(/\+\d{7,19}/, { message: 'Phone must start with a plus' })
  @IsMobilePhone()
  phone?: string;
}
