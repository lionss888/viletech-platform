import { Type } from 'class-transformer';
import { BaseDto } from 'lib/dto/base.dto';
import { AccountShortDto } from './account.dto';
import { HttpMethod } from 'lib/enums/http-method.enums';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { IAdminActivity, IAdminActivityBase } from 'lib/interfaces/models/admin-activity.interface';

export class AdminActivityBaseDto implements Omit<IAdminActivityBase, 'account'> {
  @ApiProperty({ type: AccountShortDto })
  @IsNotEmpty()
  @Type(() => AccountShortDto)
  @ValidateNested()
  account: AccountShortDto;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  path: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  params: Object;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  query: Object;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  body: Object;
}

export class AdminActivityDto
  extends IntersectionType(AdminActivityBaseDto, BaseDto)
  implements Omit<IAdminActivity, 'account'> {}
