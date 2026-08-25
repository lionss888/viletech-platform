import { Body, Controller, Inject, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AccountDto } from '../../../../lib/dto/models/account.dto';
import { AccountManagerUpdate } from '../../dto/account.update.dto';
import { IAccount } from '../../../../lib/interfaces/models/account.interface';
import { IAccountService } from '../../service/account.service.interface';
import { Request } from 'express';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';

@ApiCookieAuth()
@ApiTags('manager account')
@Controller('manager/account')
export class AccountManagerController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @Patch('')
  @ManagerMethod({ response: { status: 200, type: AccountDto } })
  patchById(@Req() req: Request, @Body() updateDto: AccountManagerUpdate): Promise<IAccount> {
    return this.service.updateOne({ _id: req.account._id }, updateDto);
  }
}
