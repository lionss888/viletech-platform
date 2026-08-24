import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IVirtualAccountService } from '../../service/virtual-account.service.interface';
import { VirtualAccountDto } from 'lib/dto/models/virtual-account.dto';
import { plainModelToClassArray } from 'lib/utils/helpers/entity.helper';
import { UserMethod } from 'lib/decorators/user-method.decorator';

@ApiCookieAuth()
@ApiTags('virtual-account')
@Controller('virtual-account')
export class VirtualAccountSiteController {
  constructor(@Inject('IVirtualAccountService') private readonly service: IVirtualAccountService) {}

  @Get()
  @UserMethod({ response: { status: 200, type: [VirtualAccountDto] } })
  async getVirtualAccounts(@Req() req: Request): Promise<VirtualAccountDto[]> {
    const virtualAccounts = await this.service.findMany({ account: req.account._id });
    return plainModelToClassArray(VirtualAccountDto, virtualAccounts);
  }
}
