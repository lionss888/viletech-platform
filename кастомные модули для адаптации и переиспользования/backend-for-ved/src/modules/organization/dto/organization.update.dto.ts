import { IOrganizationAdminUpdate, IOrganizationSiteUpdate } from '../service/organization.service.interface';
import {
  IsEmail,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { EmailFieldOptionalDto } from 'lib/dto/email-field.dto';
import { PhoneFieldOptionalDto } from 'lib/dto/phone.field.dto';
import { IFile } from 'lib/interfaces/models/file.interface';
import { Type } from 'class-transformer';
import { OrganizationSubaccountDto } from 'lib/dto/models/organization.dto';
import { IOrganizationSendSubaccountInvite } from '../service/organization-subaccount.service.interface';
import { OrganizationAdminQueryDto } from './organization.query.dto';
import { OrganizationRequisitesAddDto } from 'lib/dto/models/organization.dto';
import { IdFieldDto } from '../../../lib/dto/id-field.dto';

export class OrganizationSiteUpdateDto
  extends IntersectionType(EmailFieldOptionalDto, PhoneFieldOptionalDto)
  implements IOrganizationSiteUpdate
{
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ogrn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  kpp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  legalAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  signerName?: string;

  @ApiProperty({ required: false, enum: OrganizationSignerPositionType })
  @IsOptional()
  @IsEnum(OrganizationSignerPositionType)
  signerPosition?: OrganizationSignerPositionType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  signerOtherPosition?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  organizationCard?: string | IFile;

  @ApiProperty({ type: [OrganizationRequisitesAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationRequisitesAddDto)
  addRequisites?: OrganizationRequisitesAddDto[];

  @ApiProperty()
  @IsArray()
  @IsOptional()
  @Type(() => String)
  removeRequisites?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  addHsCodes?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  removeHsCodes?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  addHsCodePrefixes?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  removeHsCodePrefixes?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiProperty({ required: false, enum: OrganizationBusinessFormType })
  @IsOptional()
  @IsEnum(OrganizationBusinessFormType)
  businessForm?: OrganizationBusinessFormType;
}

export class OrganizationAdminUpdateDto extends OrganizationSiteUpdateDto implements IOrganizationAdminUpdate {
  @ApiProperty({ required: false, enum: OrganizationType })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;
}

export class OrganizationSendSubaccountInviteDto
  extends PickType(OrganizationSubaccountDto, ['name'])
  implements IOrganizationSendSubaccountInvite
{
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  redirectUrl: string;
}

export class OrganizationUpdateDto {}

export class OrganizationRPCUpdateDto {
  @IsNotEmpty()
  @Type(() => OrganizationAdminQueryDto)
  @ValidateNested()
  query: OrganizationAdminQueryDto;

  @IsNotEmpty()
  @Type(() => OrganizationUpdateDto)
  @ValidateNested()
  update: OrganizationUpdateDto;
}

export class DelegateToSubaccount extends IdFieldDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  delegateToSubaccount: string;
}
