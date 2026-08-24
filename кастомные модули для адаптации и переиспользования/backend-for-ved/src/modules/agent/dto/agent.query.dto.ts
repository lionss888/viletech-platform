import { Type } from 'class-transformer';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { IAgentQuery } from '../service/agent.service.interface';

export class AgentQueryDto extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto) implements IAgentQuery {}

export class AgentAdminPaginateDto
  extends IntersectionType(AgentQueryDto, PaginateDto)
  implements IAgentQuery, IPaginateOptions {}

export class AgentPaginateDto
  extends IntersectionType(AgentAdminPaginateDto, BaseOptionsDto)
  implements IAgentQuery, IPaginateOptions, IBaseOptions {}

export class AgentRPCQueryDto {
  @IsNotEmpty()
  @Type(() => AgentQueryDto)
  @ValidateNested()
  query: AgentQueryDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}

export class AgentOneCDto extends AgentQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  inn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  kpp?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;
}

export class AgentOneCPaginateDto extends IntersectionType(AgentOneCDto, PaginateDto) {}
