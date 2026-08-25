import { BaseDto } from '../base.dto';
import {
  IAccount,
  IAccountBase,
  IAccountFull,
  IAccountShort,
  IAccountTelegram,
} from 'lib/interfaces/models/account.interface';
import {
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
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { StringToBoolean } from '../../utils/transform.utils';
import { Type } from 'class-transformer';
import { AccountRole } from '../../enums/models/account.enums';
import { Lang } from '../../enums/common.enums';
import { OrganizationFullDto } from './organization.dto';
import { PhoneFieldOptionalDto } from '../phone.field.dto';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { Requisite } from '../bank-requisites.dto';

export class AccountTelegramDto implements IAccountTelegram {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  userId?: number;
}

export class AccountBaseDto extends PhoneFieldOptionalDto implements IAccountBase {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty()
  active: boolean;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty()
  blocked: boolean;

  @ApiProperty({ enumName: 'AccountRole', enum: AccountRole, type: [AccountRole] })
  @IsNotEmpty()
  @IsEnum(AccountRole, { each: true })
  roles: AccountRole[];

  @ApiProperty({ enumName: 'AccountLang', enum: Lang })
  @IsNotEmpty()
  @IsEnum(Lang)
  lang: Lang;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  organizations?: string[] | IOrganization[];

  @ApiProperty()
  @IsNotEmpty()
  @StringToBoolean()
  @IsBoolean()
  confirmed: boolean;

  @ApiProperty({ required: false, type: [Requisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Requisite)
  requisites?: Requisite[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  feePercent?: number; // индивидуальный процент комиссии

  @ApiProperty({ required: false, type: AccountTelegramDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountTelegramDto)
  telegram?: AccountTelegramDto;

  @ApiProperty()
  @IsBoolean()
  enablePostpay: boolean;

  @ApiProperty({ required: false, description: 'Пометка корпоративного клиента' })
  @IsOptional()
  @IsBoolean()
  isCorporateClient?: boolean;
}

export class AccountDto extends IntersectionType(BaseDto, AccountBaseDto) implements IAccount {}

export class AccountShortDto implements IAccountShort {
  @IsMongoId()
  @Type(() => String)
  @ApiProperty()
  _id: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class AccountFullDto extends AccountDto implements IAccountFull {
  @ApiProperty({ required: false, type: [OrganizationFullDto] })
  @IsOptional()
  @Type(() => OrganizationFullDto)
  organizations?: IOrganization[];
}
