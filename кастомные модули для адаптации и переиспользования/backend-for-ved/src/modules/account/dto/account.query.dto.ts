import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IAccountAdminQuery, IAccountQuery } from 'lib/interfaces/models/account.interface';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { BasePaginateOptionsDto, PaginateDto } from 'lib/dto/paginate.dto';
import { IBasePaginateOptions, IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { ValueToArray } from 'lib/utils/transform.utils';
import { AccountRole } from '../../../lib/enums/models/account.enums';
import { AccountTelegramDto } from '../../../lib/dto/models/account.dto';

export class AccountQueryDto extends IntersectionType(IdFieldQueryDto, IdsFieldQueryDto) implements IAccountQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  emailStrict?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ enum: AccountRole, required: false, type: [AccountRole] })
  @IsOptional()
  @ValueToArray()
  @IsEnum(AccountRole, { each: true })
  roles?: AccountRole[];

  @ApiProperty({ required: false, type: AccountTelegramDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountTelegramDto)
  telegram?: AccountTelegramDto;
}

export class AccountAdminQueryDto extends AccountQueryDto implements IAccountAdminQuery {
  @ApiProperty({ enum: AccountRole, required: false, type: AccountRole })
  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @ApiProperty({ enum: AccountRole, required: false, type: [AccountRole] })
  @IsOptional()
  @ValueToArray()
  @IsEnum(AccountRole, { each: true })
  roles?: AccountRole[];

  @ApiProperty({ enum: AccountRole, required: false, type: AccountRole })
  @IsOptional()
  @IsEnum(AccountRole)
  roleNe?: AccountRole;

  @ApiProperty({ enum: AccountRole, required: false, type: [AccountRole] })
  @IsOptional()
  @ValueToArray()
  @IsEnum(AccountRole, { each: true })
  rolesNe?: AccountRole[];
}

export class AccountPaginateDto
  extends IntersectionType(AccountQueryDto, PaginateDto)
  implements IAccountQuery, IPaginateOptions {}

export class AccountAdminPaginateDto
  extends IntersectionType(AccountAdminQueryDto, PaginateDto)
  implements IAccountQuery, IPaginateOptions {}

export class AccountRPCPaginateDto
  extends IntersectionType(AccountQueryDto, BasePaginateOptionsDto)
  implements IAccountQuery, IBasePaginateOptions {}

export class AccountRPCQueryDto {
  @IsNotEmpty()
  @Type(() => AccountQueryDto)
  @ValidateNested()
  query: AccountQueryDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}
