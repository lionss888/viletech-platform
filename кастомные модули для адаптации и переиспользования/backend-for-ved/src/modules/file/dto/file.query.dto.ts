import { IntersectionType } from '@nestjs/swagger';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IFileQuery } from '../service/file.service.interface';

export class FileQueryDto extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto) implements IFileQuery {
  @IsOptional()
  @IsBoolean()
  private?: boolean;

  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  account?: string;

  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  accounts?: string[];
}

export class FilePaginateDtoDto extends IntersectionType(FileQueryDto, PaginateDto) {}
