import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export class TemplateUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsObject()
  mapping?: IExcelMapping;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
