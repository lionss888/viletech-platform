import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsDate, IsMongoId } from 'class-validator';
import { CounterpartyBankDto } from './counterparty.create.dto';
import { CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';

export class CounterpartyUpdateDto {
  @ApiPropertyOptional({ description: 'Legal address' })
  @IsOptional()
  @IsString()
  legalAddress?: string;

  @ApiPropertyOptional({ description: 'OGRN (Russian state registration)' })
  @IsOptional()
  @IsString()
  ogrn?: string;

  @ApiPropertyOptional({ description: 'Registration number (for foreign)' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Banks to add', type: [CounterpartyBankDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CounterpartyBankDto)
  addBanks?: CounterpartyBankDto[];

  @ApiPropertyOptional({ description: 'Bank UUIDs to remove', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeBankUuids?: string[];

  @ApiPropertyOptional({ description: 'Approval status', enum: CounterpartyApprovalStatus })
  @IsOptional()
  @IsEnum(CounterpartyApprovalStatus)
  lastApprovalStatus?: CounterpartyApprovalStatus;

  @ApiPropertyOptional({ description: 'Date of last approval/rejection' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastApprovalDate?: Date;

  @ApiPropertyOptional({ description: 'Account ID of who approved/rejected' })
  @IsOptional()
  @IsMongoId()
  lastApprovedBy?: string;

  @ApiPropertyOptional({ description: 'Comment for approval/rejection' })
  @IsOptional()
  @IsString()
  lastApprovalComment?: string;
}
