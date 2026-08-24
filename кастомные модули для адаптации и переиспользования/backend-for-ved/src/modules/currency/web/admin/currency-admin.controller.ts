import { Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ICurrencyService } from '../../service/currency.service.interface';
import {
  CurrencyAdminPaginateDto,
  CurrencyAdminQueryDto,
  CurrencyRateWithBaseAdminQueryDto,
} from '../../dto/currency.query.dto';
import { CurrencyUpdateDto } from '../../dto/currency.update.dto';
import { CurrencyDto, CurrencyShortDto } from 'lib/dto/models/currency.dto';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { paginatePlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { RootMethod } from 'lib/decorators/root-method.decorator';

@ApiTags('admin currency')
@Controller('admin/currency')
export class CurrencyAdminController {
  constructor(@Inject('ICurrencyService') private readonly service: ICurrencyService) {}

  @Get()
  @RootMethod({ paginate: CurrencyDto })
  async find(@Query() fullQuery: CurrencyAdminPaginateDto): Promise<IPaginateResult<CurrencyDto>> {
    const { paginate, model } = queryPaginateParser(fullQuery, CurrencyAdminQueryDto);
    const currencyResult = await this.service.find(model, paginate);
    return paginatePlainToClass(CurrencyDto, currencyResult);
  }

  @Get('count')
  @RootMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: CurrencyAdminQueryDto): Promise<CountFieldDto> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Patch(':_id')
  @RootMethod({ response: { status: 200, type: CurrencyDto } })
  async update(@Param() findDto: IdFieldDto, @Body() dto: CurrencyUpdateDto): Promise<CurrencyDto> {
    const currency = await this.service.updateOne(findDto, dto);
    return plainModelToClass(CurrencyDto, currency);
  }

  // Получаем курсы к указанной валюте
  @Get('rate')
  @RootMethod({ response: { status: 200, type: CurrencyShortDto } })
  async findRateWithBase(@Query() dto: CurrencyRateWithBaseAdminQueryDto): Promise<CurrencyShortDto[]> {
    return this.service.findRateWithBase({ ...dto });
  }
}
