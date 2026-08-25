import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean, Matches } from 'class-validator';
import { CounterpartyType } from 'lib/enums/models/counterparty.enums';

export class CounterpartyBankAccountDto {
  @ApiProperty({ description: 'Account number', example: 'GB29NWBK60161331926' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Currency code', example: 'GBP' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Is primary account', example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPrimary?: boolean;
}

export class CounterpartyBankDto {
  @ApiProperty({ description: 'Bank name', example: 'Barclays Bank' })
  @IsString()
  bankName: string;

  @ApiPropertyOptional({ description: 'SWIFT code', example: 'BARCGB22' })
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiProperty({ description: 'Bank country', example: 'United Kingdom' })
  @IsString()
  bankCountry: string;

  @ApiPropertyOptional({ description: 'Bank address', example: '1 Churchill Place, London' })
  @IsOptional()
  @IsString()
  bankAddress?: string;

  @ApiProperty({ description: 'Bank accounts', type: [CounterpartyBankAccountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CounterpartyBankAccountDto)
  accounts: CounterpartyBankAccountDto[];
}

export class CounterpartyCreateDto {
  @ApiProperty({ description: 'Counterparty name', example: 'Foreign Buyer Ltd' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Counterparty country', example: 'Germany' })
  @IsString()
  country: string;

  @ApiProperty({ enum: CounterpartyType, description: 'Counterparty type' })
  @IsEnum(CounterpartyType)
  type: 'russian' | 'foreign';

  @ApiPropertyOptional({ description: 'INN (Russian tax number)', example: '7718962599' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$|^\d{12}$/, { message: 'INN must be 10 or 12 digits' })
  inn?: string;

  @ApiPropertyOptional({ description: 'OGRN (Russian state registration)', example: '1077747111111' })
  @IsOptional()
  @IsString()
  ogrn?: string;

  @ApiPropertyOptional({ description: 'Registration number (for foreign)', example: 'HRB1234567' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Legal address' })
  @IsOptional()
  @IsString()
  legalAddress?: string;

  @ApiProperty({ description: 'Banks list', type: [CounterpartyBankDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CounterpartyBankDto)
  banks: CounterpartyBankDto[];
}
