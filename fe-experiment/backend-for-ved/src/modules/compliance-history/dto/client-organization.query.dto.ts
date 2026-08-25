import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { OrganizationStatus } from 'lib/enums/models/organization.enums';

export class ClientOrganizationQueryDto {
  @ApiProperty({ required: false, description: 'Поиск по названию организации или ИНН' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: OrganizationStatus, required: false, description: 'Фильтр по статусу организации' })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiProperty({ type: String, format: 'date', required: false, description: 'Дата создания от' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiProperty({ type: String, format: 'date', required: false, description: 'Дата создания до' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;
}

export class ClientOrganizationPaginateDto
  extends IntersectionType(ClientOrganizationQueryDto, PaginateDto)
  implements IPaginateOptions {}
