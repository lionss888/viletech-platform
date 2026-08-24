import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ICurrencyService } from '../../service/currency.service.interface';
import { CurrencyRateWithBaseSiteQueryDto, CurrencyPaginateDto, CurrencyQueryDto } from '../../dto/currency.query.dto';
import { SymbolWithSourceDto } from '../../dto/symbol.dto';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { paginatePlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { Method } from 'lib/decorators/method.decorator';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { CurrencyDto, CurrencyShortDto } from 'lib/dto/models/currency.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { RateStrategy } from 'lib/enums/models/currency.enums';

@ApiTags('currency')
@Controller('currency')
export class CurrencySiteController {
  constructor(@Inject('ICurrencyService') private readonly service: ICurrencyService) {}

  @Get()
  @Method({ paginate: CurrencyDto })
  async find(@Query() fullQuery: CurrencyPaginateDto): Promise<IPaginateResult<CurrencyDto>> {
    const { paginate, model } = queryPaginateParser(fullQuery, CurrencyQueryDto);
    const currencyResult = await this.service.find({ ...model, active: true }, paginate);

    return paginatePlainToClass(CurrencyDto, currencyResult);
  }

  // Получаем курсы для главной страницы
  @Get('dashboard-rate')
  @Method({ response: { status: 200, type: CurrencyShortDto } })
  async findDashboardRates(@Query() dto: CurrencyRateWithBaseSiteQueryDto): Promise<CurrencyShortDto[]> {
    return this.service.findRateWithBase({ ...dto, inverse: true, strategy: RateStrategy.BASE_STRONGER });
  }

  @Get('count')
  @Method({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: CurrencyQueryDto): Promise<CountFieldDto> {
    const result = await this.service.count({ ...dto, active: true });
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':symbol/:source')
  @ApiNotFoundMessagesResponse(['Currency not found.'])
  @Method({ response: { status: 200, type: CurrencyDto } })
  async findByName(@Param() dto: SymbolWithSourceDto): Promise<CurrencyDto> {
    const currencies = await this.service.findMany(dto);

    // Получаем массив с единственным currency с самым высоким  курсом
    const highestCurrency = await this.service.getCurrenciesWithBorderlineRates({
      currencies,
      strategy: RateStrategy.BASE_WEAKER,
    });

    if (!highestCurrency.length) {
      throw new NotFoundException('Currency not found.');
    }

    return plainModelToClass(CurrencyDto, highestCurrency[0]);
  }
}
