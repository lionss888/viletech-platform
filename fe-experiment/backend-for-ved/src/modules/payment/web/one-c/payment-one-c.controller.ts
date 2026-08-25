import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { PAYMENT_SERVICE } from '../../payment.constants';
import { IPaymentService } from '../../service/payment.service.interface';
import { OneCMethod } from '../../../../lib/decorators/one-c-method.decorator';
import { PaymentCreateForFormDto, PaymentCreateManyForFormDto } from '../../dto/payment.create.dto';
import { PaymentOneCPaginateDto, PaymentOneCQueryDto } from '../../dto/payment.query.dto';
import {
  paginateHasNextPlainToClass,
  plainModelToClass,
  queryPaginateParser,
} from '../../../../lib/utils/helpers/entity.helper';
import { PaymentFrom } from '../../../../lib/enums/models/payment.enums';
import { PaymentDto } from '../../../../lib/dto/models/payment.dto';
import { CountFieldDto } from '../../../../lib/dto/count-field.dto';

@ApiCookieAuth()
@ApiTags('1C payment')
@Controller('1c/payment')
export class PaymentOneCController {
  constructor(@Inject(PAYMENT_SERVICE) private readonly service: IPaymentService) {}

  @Get()
  @OneCMethod({
    summary: 'Возвращает платежи с пагинацией',
    hasNextPaginate: PaymentDto,
  })
  async getPaginated(@Query() dto: PaymentOneCPaginateDto) {
    const { model, paginate } = queryPaginateParser(dto, PaymentOneCQueryDto);
    const paginateResult = await this.service.find(
      {
        ...model,
        paymentFrom: PaymentFrom.ONE_C,
      },
      paginate,
    );
    return paginateHasNextPlainToClass(PaymentDto, paginateResult);
  }

  @Get('count')
  @OneCMethod({
    summary: 'Возвращает количество заявок',
    response: { type: CountFieldDto },
  })
  async count(@Query() dto: PaymentOneCQueryDto) {
    const result = await this.service.count({
      ...dto,
      paymentFrom: PaymentFrom.ONE_C,
    });
    return plainModelToClass(CountFieldDto, result);
  }

  @Post()
  @OneCMethod({
    summary: 'Добавление платежа',
  })
  async addPayment(@Body() dto: PaymentCreateForFormDto): Promise<void> {
    await this.service.addPayment(dto);
  }

  @Post('many')
  @OneCMethod({
    summary: 'Добавление платежей',
  })
  async addManyPayments(@Body() dto: PaymentCreateManyForFormDto): Promise<void> {
    await this.service.addPayments(dto.payments);
  }
}
