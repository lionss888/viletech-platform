import { IsNotEmptyObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IntersectionType, PickType } from '@nestjs/swagger';
import { CodeFieldDto } from 'lib/dto/code-field.dto';
import { CodeDto } from 'lib/dto/models/code.dto';
import { IAccountVerifySecurityCode } from '../service/account.service.interface';
import { AccountDto } from 'lib/dto/models/account.dto';

export class AccountVerifySecurityCodeDto
  extends IntersectionType(CodeFieldDto, PickType(CodeDto, ['code', 'type'] as const))
  implements IAccountVerifySecurityCode
{
  @IsNotEmptyObject()
  @Type(() => AccountDto)
  @ValidateNested()
  account: AccountDto;
}
