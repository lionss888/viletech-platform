import { Controller, Inject } from '@nestjs/common';
import { ICurrencyService } from '../service/currency.service.interface';
import {
  CurrencyRateWithBaseAdminQueryDto,
  CurrencyFindPaginateDto,
  CurrencyFindQueryDto,
} from '../dto/currency.query.dto';
import { CurrencyRPCConvertDto } from '../dto/currency.convert.dto';
import { CurrencyPattern } from 'lib/enums/models/currency.enums';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { ICurrency, ICurrencyShort } from 'lib/interfaces/models/currency.interface';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IAmountField } from 'lib/interfaces/amount-field.interface';
import { CurrencyRPCUpdateDto } from '../dto/currency.update.dto';

@Controller()
export class CurrencyRPCController {
  constructor(@Inject('ICurrencyService') private readonly service: ICurrencyService) {}

  @CatcherMessagePattern(CurrencyPattern.FIND_WITH_PAGINATE)
  async findIdByAlias(params: CurrencyFindPaginateDto): Promise<IPaginateResult<ICurrency>> {
    const { model, paginate } = queryPaginateParser(params, CurrencyFindQueryDto);
    return this.service.find(model, paginate);
  }

  @CatcherMessagePattern(CurrencyPattern.FIND_ONE_OR_EXCEPTION)
  findOneOrException(params: CurrencyFindQueryDto): Promise<ICurrency> {
    return this.service.findOneOrException(params);
  }

  @CatcherMessagePattern(CurrencyPattern.EXIST)
  exist(params: CurrencyFindQueryDto): Promise<boolean> {
    return this.service.exist(params);
  }

  @CatcherMessagePattern(CurrencyPattern.CONVERT)
  convert(dto: CurrencyRPCConvertDto): Promise<IAmountField> {
    return this.service.convert(dto);
  }

  @CatcherMessagePattern(CurrencyPattern.FIND_RATE_WITH_BASE)
  findRateWithBase(dto: CurrencyRateWithBaseAdminQueryDto): Promise<ICurrencyShort[]> {
    return this.service.findRateWithBase(dto);
  }

  @CatcherMessagePattern(CurrencyPattern.UPDATE_MANY)
  updateMany({ query, update }: CurrencyRPCUpdateDto): Promise<void> {
    return this.service.updateMany(query, update);
  }

  @CatcherMessagePattern(CurrencyPattern.REFRESH_CURRENCIES)
  refreshCurrencies(): Promise<void> {
    return this.service.refreshCurrencies();
  }
}
