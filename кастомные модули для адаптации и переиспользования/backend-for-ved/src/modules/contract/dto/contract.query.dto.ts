import { Type } from 'class-transformer';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { IContractQuery } from '../service/contract.service.interface';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';

export class ContractQueryDto extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto) implements IContractQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  agent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  organization?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  organizations?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isTemplate?: boolean;

  @ApiProperty({ required: false, enumName: 'ContractStatus', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

export class ContractQuerySiteDto extends ContractQueryDto implements IContractQuery {}
export class ContractSitePaginateDto
  extends IntersectionType(IntersectionType(ContractQuerySiteDto, PaginateDto), BaseOptionsDto)
  implements IContractQuery, IPaginateOptions, IBaseOptions {}

export class ContractQueryAdminDto extends ContractQueryDto implements IContractQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  account?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  accounts?: string[];
}

export class ContractAdminPaginateDto
  extends IntersectionType(IntersectionType(ContractQueryAdminDto, PaginateDto), BaseOptionsDto)
  implements IContractQuery, IPaginateOptions, IBaseOptions {}

export class ContractRPCQueryDto {
  @IsNotEmpty()
  @Type(() => ContractQueryAdminDto)
  @ValidateNested()
  query: ContractQueryAdminDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}
