import { PaginateDto } from 'lib/dto/paginate.dto';
import { HttpMethod } from 'lib/enums/http-method.enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IAdminActivityQuery } from '../service/admin-activity.service.interface';

export class AdminActivityQueryDto extends IdsFieldQueryDto implements IAdminActivityQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, enum: HttpMethod, enumName: 'HttpMethod' })
  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;
}

export class AdminActivityPaginateDto extends IntersectionType(AdminActivityQueryDto, PaginateDto) {}
