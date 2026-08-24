import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseDto } from '../base.dto';
import { EmailFieldDto } from '../email-field.dto';
import { PhoneFieldDto } from '../phone.field.dto';
import {
  IOrganization,
  IOrganizationBase,
  IOrganizationSubaccount,
  IOrganizationRequisitesAdd,
  IOrganizationSigner,
} from 'lib/interfaces/models/organization.interface';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationSubaccountStatusType,
  OrganizationStatus,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { Type } from 'class-transformer';
import { IFile } from 'lib/interfaces/models/file.interface';
import { FileDto } from './file.dto';
import { Requisite } from '../bank-requisites.dto';
import { AccountDto } from './account.dto';
import { IAccount } from '../../interfaces/models/account.interface';

export class OrganizationRequisiteDto extends Requisite {
  @ApiProperty()
  @IsOptional()
  @IsString()
  uuid?: string;
}

export class OrganizationSignerDto implements IOrganizationSigner {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  signerName: string;

  @ApiProperty({ required: true, enum: OrganizationSignerPositionType })
  @IsEnum(OrganizationSignerPositionType)
  @IsNotEmpty()
  signerPosition: OrganizationSignerPositionType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  signerOtherPosition?: string;
}

export class OrganizationSubaccountDto implements IOrganizationSubaccount {
  @ApiProperty({ type: AccountDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AccountDto)
  account: IAccount;

  @ApiProperty({ description: 'Имя субаккаунта' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: OrganizationSubaccountStatusType,
    description: 'Статус пользователя в организации',
  })
  @IsEnum(OrganizationSubaccountStatusType)
  status: OrganizationSubaccountStatusType;

  @ApiProperty({ type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  inviteDate?: Date;
}

export class OrganizationSubaccountShortAccountDto
  extends OmitType(OrganizationSubaccountDto, ['account'])
  implements IOrganizationSubaccount
{
  @IsMongoId()
  @IsNotEmpty()
  @Type(() => String)
  account: string;
}

export class OrganizationBaseDto
  extends IntersectionType(EmailFieldDto, PhoneFieldDto, OrganizationSignerDto)
  implements IOrganizationBase
{
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  inn: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ogrn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  kpp?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  legalAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  @Type(() => String)
  account?: string;

  @ApiProperty({ required: true, enum: OrganizationType })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;

  @ApiProperty({ required: true, enum: OrganizationBusinessFormType })
  @IsEnum(OrganizationBusinessFormType)
  @IsNotEmpty()
  businessForm: OrganizationBusinessFormType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  organizationCard?: string | IFile;

  @ApiProperty({ required: true, type: [OrganizationSubaccountDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationSubaccountDto)
  subaccounts: OrganizationSubaccountDto[];

  @ApiProperty({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  approvedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [OrganizationRequisiteDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationRequisiteDto)
  requisites?: OrganizationRequisiteDto[];
}

export class OrganizationDto extends IntersectionType(OrganizationBaseDto, BaseDto) implements IOrganization {}

export class OrganizationFullDto extends OrganizationDto {
  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  organizationCard?: IFile;
}

export class OrganizationRequisitesAddDto
  extends OmitType(OrganizationRequisiteDto, ['uuid'])
  implements IOrganizationRequisitesAdd {}
