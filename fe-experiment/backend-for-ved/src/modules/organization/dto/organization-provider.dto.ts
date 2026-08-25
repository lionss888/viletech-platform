import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { OrganizationBaseDto } from 'lib/dto/models/organization.dto';
import { OrganizationSiteUpdateDto } from './organization.update.dto';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class OrganizationProviderCreateDto extends OmitType(OrganizationBaseDto, [
  'type',
  'status',
  'isDeleted',
  'subaccounts',
  'account',
  'organizationCard',
] as const) {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10}(\d{2})?$/, { message: 'inn must be 10 or 12 digits' })
  inn: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/u, { message: 'kpp must be 9 digits' })
  kpp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class OrganizationProviderUpdateDto extends PartialType(OrganizationSiteUpdateDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}(\d{2})?$/, { message: 'inn must be 10 or 12 digits' })
  inn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/u, { message: 'kpp must be 9 digits' })
  kpp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
