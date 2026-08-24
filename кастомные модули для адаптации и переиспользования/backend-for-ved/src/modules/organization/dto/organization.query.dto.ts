import { PaginateDto } from 'lib/dto/paginate.dto';
import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { IOrganizationAdminQuery, IOrganizationSiteQuery } from '../service/organization.service.interface';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationStatus,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { StringToBoolean } from '../../../lib/utils/transform.utils';

export class OrganizationSiteQueryDto
  extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto)
  implements IOrganizationSiteQuery
{
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  subaccount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  isDeleted?: boolean;
}

export class OrganizationSitePaginateDto
  extends IntersectionType(OrganizationSiteQueryDto, PaginateDto)
  implements IOrganizationSiteQuery, IPaginateOptions {}

export class OrganizationAdminQueryDto
  extends OmitType(OrganizationSiteQueryDto, ['subaccount'])
  implements IOrganizationAdminQuery
{
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  subaccount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  signerName?: string;

  @ApiProperty({ required: false, enum: OrganizationSignerPositionType })
  @IsOptional()
  @IsEnum(OrganizationSignerPositionType)
  signerPosition?: OrganizationSignerPositionType;

  @ApiProperty({ required: false, enum: OrganizationBusinessFormType })
  @IsOptional()
  @IsEnum(OrganizationBusinessFormType)
  businessForm?: OrganizationBusinessFormType;

  @ApiProperty({ required: false, enum: OrganizationType })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiProperty({ required: false, enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  isActive?: boolean;
}

export class OrganizationAdminPaginateDto
  extends IntersectionType(OrganizationAdminQueryDto, PaginateDto)
  implements IOrganizationAdminQuery, IPaginateOptions {}

export class OrganizationRPCQueryDto {
  @IsNotEmpty()
  @Type(() => OrganizationAdminQueryDto)
  @ValidateNested()
  query: OrganizationAdminQueryDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}
