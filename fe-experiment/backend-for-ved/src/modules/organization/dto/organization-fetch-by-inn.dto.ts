import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class OrganizationFetchByInnDto {
  @ApiProperty({
    description: 'INN - Russian Tax Identification Number (10 or 12 digits)',
    example: '7700000062',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10}$|^\d{12}$/, {
    message: 'INN must be 10 or 12 digits',
  })
  inn: string;
}

export class OrganizationFetchByInnResponseDto {
  @ApiProperty({
    description: 'INN - Russian Tax Identification Number',
    example: '7700000062',
  })
  inn: string;

  @ApiProperty({
    description: 'OGRN - Main State Registration Number',
    example: '1027700000062',
    required: false,
  })
  ogrn?: string;

  @ApiProperty({
    description: 'KPP - Reason Code for Registration',
    example: '770001001',
    required: false,
  })
  kpp?: string;

  @ApiProperty({
    description: 'Legal address of the organization',
    example: 'Moscow, Tverskaya Street, 1',
    required: false,
  })
  legalAddress?: string;

  @ApiProperty({
    description: 'Full name of the organization',
    example: 'Public Joint-Stock Company Gazprom',
    required: false,
  })
  fullName?: string;

  @ApiProperty({
    description: 'Short name of the organization (for display)',
    example: 'ПАО Газпром',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Business form of the organization',
    example: 'PAO',
    required: false,
  })
  businessForm?: string;

  @ApiProperty({
    description: 'CEO full name',
    example: 'Миллер Алексей Борисович',
    required: false,
  })
  ceoName?: string;

  @ApiProperty({
    description: 'CEO position',
    example: 'general_director',
    required: false,
  })
  ceoPosition?: string;
}
