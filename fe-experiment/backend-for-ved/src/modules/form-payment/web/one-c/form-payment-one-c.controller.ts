import { FormPayment1CRequesterDto, FormPaymentDto } from 'lib/dto/models/form-payment.dto';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { FormPaymentOneCPaginateDto, FormPaymentOneCQueryDto } from '../../dto/form-payment.query.dto';
import { OneCMethod } from 'lib/decorators/one-c-method.decorator';
import { IFormPaymentOneCService } from 'modules/form-payment/service/additional/form-payment-one-c.service.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';

@ApiExtraModels(FormPaymentDto)
@ApiCookieAuth()
@ApiTags('1C form-payment')
@Controller('1c/form-payment')
export class FormPaymentOneCController {
  constructor(@Inject('IFormPaymentOneCService') private readonly service: IFormPaymentOneCService) {}

  @Get()
  @OneCMethod({
    summary: 'Список заявок для 1C с пагинацией',
    hasNextPaginate: FormPayment1CRequesterDto,
    response: { status: 200, type: FormPayment1CRequesterDto },
  })
  async findWithPaginate(@Query() dto: FormPaymentOneCPaginateDto): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { model, paginate } = queryPaginateParser(dto, FormPaymentOneCQueryDto);
    const paginateResult = await this.service.find(model, {
      ...paginate,
      include: ['docs', 'invoices', 'agent', 'organization', 'transactions', 'provider'],
    });
    return paginateHasNextPlainToClass(FormPayment1CRequesterDto, paginateResult);
  }

  @Get('count')
  @OneCMethod({ summary: 'Количество заявок', response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: FormPaymentOneCQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }
}
