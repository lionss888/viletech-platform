import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddAccountDto {
  @ApiProperty({ description: 'Account number', example: 'GB29NWBK60161331926819' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Is primary account', example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPrimary?: boolean;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Is primary account', example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPrimary?: boolean;
}
