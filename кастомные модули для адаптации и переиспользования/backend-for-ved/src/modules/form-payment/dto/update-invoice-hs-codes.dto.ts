import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateInvoiceHsCodesDto {
  @ApiProperty({
    description:
      'Array of HS codes (4-12 digits, no spaces or special characters)',
    example: ['0101210000', '0201300000'],
    type: [String],
    minItems: 1,
  })
  @IsArray({ message: 'Codes must be an array' })
  @ArrayMinSize(1, { message: 'At least one HS code is required' })
  @IsString({ each: true, message: 'Each code must be a string' })
  @IsNotEmpty({ each: true, message: 'Code cannot be empty' })
  @Matches(/^[0-9]{4,12}$/, {
    each: true,
    message:
      'Each HS code must be 4-12 digits without spaces or special characters',
  })
  @Transform(({ value }: { value: string[] }) =>
    value.map((el) => el.replace(/\s+/g, '')),
  )
  codes: string[];
}
