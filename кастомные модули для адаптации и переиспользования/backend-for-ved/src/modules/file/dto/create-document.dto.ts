import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsObject, IsDate, IsEnum } from 'class-validator';
import { ICreateDocumentDocx, ICreateReportDocuments } from '../service/file.service.interface';
import { IdFieldDto } from '../../../lib/dto/id-field.dto';
import { Type } from 'class-transformer';
import { DOCX_FILES } from 'lib/docx/enums';

export class CreateDocumentDocxDto implements ICreateDocumentDocx {
  @ApiProperty()
  @IsEnum(DOCX_FILES)
  name: DOCX_FILES;

  @ApiProperty({
    description: 'Account ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  account?: string;

  @ApiProperty({
    description: 'Document filename',
    example: 'agent-report-123.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiProperty({
    description: 'Is document private',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  private?: boolean;

  @ApiProperty({
    description: 'Is document private',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsObject()
  data?: object;
}

export class CreateReportDocuments extends IdFieldDto implements ICreateReportDocuments {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentOrderNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentOrderDate?: Date;
}
