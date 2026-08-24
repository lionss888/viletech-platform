import { Body, Controller, Get, Inject, Param, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AccountDto, AccountFullDto } from '../../../../lib/dto/models/account.dto';
import { AccountProviderUpdate } from '../../dto/account.update.dto';
import { IAccount } from '../../../../lib/interfaces/models/account.interface';
import { IAccountService } from '../../service/account.service.interface';
import { Request } from 'express';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { plainModelToClass } from '../../../../lib/utils/helpers/entity.helper';
import { ComplianceOfficerMethod } from 'lib/decorators/compliance-officer-method.decorator';

@ApiCookieAuth()
@ApiTags('compliance officer account')
@Controller('compliance-officer/account')
export class AccountComplianceOfficerController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @Get(':_id')
  @ComplianceOfficerMethod({ response: { status: 200, type: AccountDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IAccount> {
    const model = await this.service.findOneOrException(dto, { include: ['organizations'] });
    return plainModelToClass(AccountFullDto, model);
  }

  @Patch('')
  @ComplianceOfficerMethod({ response: { status: 200, type: AccountDto } })
  patchById(@Req() req: Request, @Body() updateDto: AccountProviderUpdate): Promise<IAccount> {
    return this.service.updateOne({ _id: req.account._id }, updateDto);
  }
}
