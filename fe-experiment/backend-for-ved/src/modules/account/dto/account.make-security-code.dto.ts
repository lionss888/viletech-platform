import { IsNotEmptyObject, ValidateNested } from 'class-validator';
import { PickType } from '@nestjs/swagger';
import { IAccountMakeSecurityCode } from '../service/account.service.interface';
import { AccountDto } from 'lib/dto/models/account.dto';
import { CodeDto } from 'lib/dto/models/code.dto';

export class AccountMakeSecurityCodeDto
  extends PickType(CodeDto, ['type'] as const)
  implements IAccountMakeSecurityCode
{
  @IsNotEmptyObject()
  @ValidateNested()
  account: AccountDto;
}
