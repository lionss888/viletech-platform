import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import {
  IAccountAdminUpdate,
  IAccountSiteUpdate,
  IAccountUpdateByPairs,
  IAccountUpdateSiteById,
} from '../service/account.service.interface';
import { Lang } from 'lib/enums/common.enums';
import { Type } from 'class-transformer';
import { AccountQueryDto } from './account.query.dto';
import { AccountOptionsDto } from './account.options.dto';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { PasswordFieldOptionDto } from '../../../lib/dto/password-field.dto';
import { AccountRole } from '../../../lib/enums/models/account.enums';
import { AccountDto } from '../../../lib/dto/models/account.dto';
import { Requisite } from 'lib/dto/bank-requisites.dto';

export class AccountSiteUpdateDto extends PickType(AccountDto, ['phone', 'telegram']) implements IAccountSiteUpdate {
  @IsOptional()
  @IsEnum(Lang)
  @ApiProperty({ required: false, enum: Lang, enumName: 'Lang' })
  lang?: Lang;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramUserName?: string;
}

export class AccountManagerUpdate extends AccountSiteUpdateDto implements IAccountAdminUpdate {}

export class AccountProviderUpdate extends AccountSiteUpdateDto implements IAccountAdminUpdate {
  @ApiProperty({ required: false, type: [Requisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Requisite)
  requisites?: Requisite[];
}

export class AccountAdminUpdateDto
  extends IntersectionType(AccountProviderUpdate, PasswordFieldOptionDto)
  implements IAccountAdminUpdate
{
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  telegramUserId?: number;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, enumName: 'AccountRole', enum: AccountRole, type: [AccountRole] })
  @IsOptional()
  @IsEnum(AccountRole, { each: true })
  roles?: AccountRole[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  feePercent?: number; // индивидуальный процент комиссии

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enablePostpay?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCorporateClient?: boolean;
}

export class AccountRPCUpdateDto {
  @IsNotEmpty()
  @Type(() => AccountQueryDto)
  @ValidateNested()
  query: AccountQueryDto;

  @IsNotEmpty()
  @Type(() => AccountAdminUpdateDto)
  @ValidateNested()
  update: AccountAdminUpdateDto;

  @IsOptional()
  @Type(() => AccountOptionsDto)
  @ValidateNested()
  options?: AccountOptionsDto;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  @Type(() => String)
  addOrganizations?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  @Type(() => String)
  removeOrganizations?: string[];
}

export class AccountUpdateSiteByIdDto extends IdFieldDto implements IAccountUpdateSiteById {
  update: AccountSiteUpdateDto;
}

export class AccountUpdateByPairsDto implements IAccountUpdateByPairs {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountUpdateSiteByIdDto)
  pairs: AccountUpdateSiteByIdDto[];
}
