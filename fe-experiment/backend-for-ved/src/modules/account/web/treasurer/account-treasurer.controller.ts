import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { AccountDto, AccountFullDto } from 'lib/dto/models/account.dto';
import { IAccountService } from '../../service/account.service.interface';
import { TreasurerMethod } from '../../../../lib/decorators/treasurer-method.decorator';

@ApiCookieAuth()
@ApiTags('treasurer account')
@Controller('treasurer/account')
export class AccountTreasurerController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @Get(':_id')
  @TreasurerMethod({ response: { status: 200, type: AccountFullDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IAccount> {
    const model = await this.service.findOneOrException(dto, { include: ['organizations'] });
    return plainModelToClass(AccountFullDto, model);
  }
}

