import { IsOptional, IsString } from 'class-validator';

export class TemplateQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
