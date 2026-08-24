import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IAccountService } from '../../service/account.service.interface';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { AccountDto, AccountFullDto } from 'lib/dto/models/account.dto';
import { AccountAdminUpdateDto } from '../../dto/account.update.dto';
import { AccountAdminPaginateDto, AccountAdminQueryDto, AccountQueryDto } from '../../dto/account.query.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { RootMethod } from 'lib/decorators/root-method.decorator';
import { AccountCreateAdminDto } from '../../dto/account.create.dto';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';

@ApiCookieAuth()
@ApiTags('admin account')
@Controller('admin/account')
export class AccountAdminController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @Get()
  @ManagerMethod({ hasNextPaginate: AccountDto })
  async findWithPaginate(@Query() dto: AccountAdminPaginateDto): Promise<IPaginateHasNextResult<IAccount>> {
    const { paginate, model } = queryPaginateParser(dto, AccountAdminQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(AccountDto, result);
  }

  @Post()
  @RootMethod({ response: { status: 201, type: AccountDto } })
  async createAdmin(@Body() dto: AccountCreateAdminDto): Promise<IAccount> {
    const account = await this.service.createAdminByRoot(dto);
    return plainModelToClass(AccountDto, account);
  }

  @Get('count')
  @ManagerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: AccountQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':_id')
  @ManagerMethod({ response: { status: 200, type: AccountDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IAccount> {
    const model = await this.service.findOneOrException(dto, { include: ['organizations'] });
    return plainModelToClass(AccountFullDto, model);
  }

  @Patch(':_id')
  @RootMethod({ response: { status: 200, type: AccountDto } })
  patchById(@Param() dto: IdFieldDto, @Body() updateDto: AccountAdminUpdateDto): Promise<IAccount> {
    return this.service.updateOne(dto, updateDto);
  }

  // TODO Обрабатывать удаление пользователя
  // @Delete(':_id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @ApiNotFoundMessagesResponse(['Account not found.'])
  // @RootMethod({ response: { status: 204 } })
  // removeOne(@Param() dto: IdFieldDto): Promise<void> {
  //   return this.service.deleteOneOrException(dto);
  // }
}
