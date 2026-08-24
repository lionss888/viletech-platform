import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export class TemplateCreateDto {
  @IsString()
  name: string;

  @IsString()
  fileId: string;

  @IsObject()
  mapping: IExcelMapping;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
