import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IAccountService } from '../../service/account.service.interface';
import { AccountDto, AccountFullDto } from 'lib/dto/models/account.dto';
import { plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { AccountSiteUpdateDto } from 'modules/account/dto/account.update.dto';

@ApiCookieAuth()
@ApiTags('account')
@Controller('account')
export class AccountSiteController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @Get()
  @UserMethod({ response: { status: 201, type: AccountDto } })
  getAccount(@Req() req: Request): AccountDto {
    return plainModelToClass(AccountDto, req.account);
  }

  @Get('full')
  @UserMethod({ response: { status: 201, type: AccountFullDto } })
  async getAccountFull(@Req() req: Request): Promise<AccountFullDto> {
    const model = await this.service.findOneOrException({ _id: req.account._id }, { include: ['organizations'] });

    return plainModelToClass(AccountFullDto, model);
  }

  @Patch()
  @UserMethod({ response: { status: 200, type: AccountDto } })
  patchById(@Req() req: Request, @Body() updateDto: AccountSiteUpdateDto): Promise<AccountDto> {
    return this.service.updateOne({ _id: req.account._id }, updateDto);
  }
}
