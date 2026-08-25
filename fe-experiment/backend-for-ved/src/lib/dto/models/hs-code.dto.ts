import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { BaseDto } from '../base.dto';
import { IHsCode, IHsCodeSnapshot } from '../../interfaces/models/hs-code.interface';
import { HsCodeLoyalty } from '../../enums/models/hs-code.enums';
import { IntersectionType } from '@nestjs/swagger';

export class HsCodeDto extends IntersectionType(BaseDto) implements IHsCode {
  @ApiProperty({ example: '0101210000' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Живые лошади племенные чистопородные' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'I. Живые животные +', required: false })
  @IsOptional()
  @IsString()
  chapter?: string;

  @ApiProperty({ example: 'Живые животные', required: false })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ example: 'Лошади, ослы, мулы...', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ enum: HsCodeLoyalty, example: HsCodeLoyalty.OK })
  @IsNotEmpty()
  @IsEnum(HsCodeLoyalty)
  loyalty: HsCodeLoyalty;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  active: boolean;
}

export class HsCodeSnapshotDto implements IHsCodeSnapshot {
  @ApiProperty({ example: '0101210000' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Живые лошади племенные чистопородные', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chapter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ enum: HsCodeLoyalty, required: false })
  @IsOptional()
  @IsEnum(HsCodeLoyalty)
  loyalty?: HsCodeLoyalty;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  isManual: boolean;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  isActive: boolean;
}

export class CreateHsCodeDto {
  @ApiProperty({ example: '0101210000', description: 'Unique HS code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Живые лошади племенные чистопородные', description: 'Human-readable description' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ enum: HsCodeLoyalty, example: HsCodeLoyalty.OK, description: 'Risk status' })
  @IsNotEmpty()
  @IsEnum(HsCodeLoyalty)
  loyalty: HsCodeLoyalty;

  @ApiProperty({ example: 'I. Живые животные +', required: false })
  @IsOptional()
  @IsString()
  chapter?: string;

  @ApiProperty({ example: 'Живые животные', required: false })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ example: 'Лошади, ослы, мулы...', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateHsCodeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: HsCodeLoyalty, required: false })
  @IsOptional()
  @IsEnum(HsCodeLoyalty)
  loyalty?: HsCodeLoyalty;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
