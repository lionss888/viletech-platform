import { BaseDto } from 'lib/dto/base.dto';
import { IsBoolean, IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FileParseStatus } from 'lib/enums/models/file.enums';
import { IFormPaymentParsedData } from 'lib/interfaces/excel-parser.interface';

export class FileDto extends BaseDto {
  @ApiProperty({ required: false })
  @Type(() => String)
  @IsMongoId()
  @IsOptional()
  account?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  salt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @Expose()
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  originalName: string;

  @Expose()
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @Expose()
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  size: number;

  @Expose()
  @ApiProperty({ default: false })
  @IsNotEmpty()
  @IsBoolean()
  private: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  parsedValue?: IFormPaymentParsedData;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parseError?: string;

  @ApiProperty({ required: false, enum: FileParseStatus })
  @IsOptional()
  @IsEnum(FileParseStatus)
  parseStatus?: FileParseStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parseTemplateId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastParsedAt?: Date;
}

export class RequestFileStreamDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  destination: string;
}
