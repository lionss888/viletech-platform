import { Controller, Inject } from '@nestjs/common';
import { IAccountService, IVerifyPassword } from '../service/account.service.interface';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { AccountCreateDto } from '../dto/account.create.dto';
import { AccountRPCUpdateDto, AccountUpdateByPairsDto } from '../dto/account.update.dto';
import { AccountQueryDto, AccountRPCPaginateDto, AccountRPCQueryDto } from '../dto/account.query.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { CodeBaseDto } from '../../../lib/dto/models/code.dto';

@Controller()
export class AccountRPCController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  @CatcherMessagePattern(AccountPattern.CREATE)
  create(dto: AccountCreateDto): Promise<IAccount> {
    return this.service.create(dto);
  }

  @CatcherMessagePattern(AccountPattern.CREATE_ADMIN)
  createAdmin(): Promise<IAccount> {
    return this.service.createAdmin();
  }

  @CatcherMessagePattern(AccountPattern.UPDATE_ONE)
  updateOne({ query, update, options }: AccountRPCUpdateDto): Promise<IAccount> {
    return this.service.updateOne(query, update, options);
  }

  @CatcherMessagePattern(AccountPattern.FIND_ONE)
  async findOne({ query, options }: AccountRPCQueryDto): Promise<IAccount> {
    return this.service.findOne(query, options);
  }

  @CatcherMessagePattern(AccountPattern.FIND_MANY)
  async findMany({ query, options }: AccountRPCQueryDto): Promise<IAccount[]> {
    return this.service.findMany(query, options);
  }

  @CatcherMessagePattern(AccountPattern.FIND_ONE_OR_EXCEPTION)
  async findOneOrException({ query, options }: AccountRPCQueryDto): Promise<IAccount | undefined> {
    return this.service.findOneOrException(query, options);
  }

  @CatcherMessagePattern(AccountPattern.FIND_WITH_PAGINATE)
  find(dto: AccountRPCPaginateDto): Promise<IPaginateHasNextResult<IAccount>> {
    const { paginate, model } = queryPaginateParser(dto, AccountQueryDto, ['include']);
    return this.service.find(model, paginate);
  }

  @CatcherMessagePattern(AccountPattern.VERIFY_PASSWORD)
  async verifyPassword(dto: IVerifyPassword): Promise<any> {
    return this.service.verifyPassword(dto);
  }

  @CatcherMessagePattern(AccountPattern.VERIFY_CODE)
  async verify(data: CodeBaseDto): Promise<void> {
    return this.service.verifyCode(data);
  }

  @CatcherMessagePattern(AccountPattern.UPDATE_BY_PAIRS)
  async updateByPairs(dto: AccountUpdateByPairsDto): Promise<void> {
    await this.service.updateByPairs(dto);
  }

  @CatcherMessagePattern(AccountPattern.FIND_OR_CREATE)
  async findOrCreate(dto: any): Promise<IAccount> {
    return this.service.findOrCreate(dto);
  }
}
