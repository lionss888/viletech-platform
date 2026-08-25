import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { PaymentDto } from '../../../../lib/dto/models/payment.dto';
import { PaymentManagerPaginateDto, PaymentOneCQueryDto } from '../../dto/payment.query.dto';
import { paginateHasNextPlainToClass, queryPaginateParser } from '../../../../lib/utils/helpers/entity.helper';
import { PaymentEntityType, PaymentFrom } from '../../../../lib/enums/models/payment.enums';
import { PAYMENT_SERVICE } from '../../payment.constants';
import { IPaymentService } from '../../service/payment.service.interface';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';

@ApiCookieAuth()
@ApiTags('manager payment')
@Controller('admin/manager/payment')
export class PaymentManagerController {
  constructor(@Inject(PAYMENT_SERVICE) private readonly service: IPaymentService) {}

  @Get()
  @ManagerMethod({
    summary: 'Возвращает платежи с пагинацией',
    hasNextPaginate: PaymentDto,
  })
  async getPaginated(@Query() dto: PaymentManagerPaginateDto) {
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

  @Get('by-form-payment/:_id')
  @ManagerMethod({
    summary: 'Возвращает платежи с пагинацией по id заявки',
    hasNextPaginate: PaymentDto,
  })
  async getByFormPaymentIdPaginated(@Param() params: IdFieldDto, @Query() dto: PaymentManagerPaginateDto) {
    const { model, paginate } = queryPaginateParser(dto, PaymentOneCQueryDto);
    const paginateResult = await this.service.find(
      {
        ...model,
        paymentFrom: PaymentFrom.ONE_C,
        entityType: PaymentEntityType.FORM_PAYMENT,
        entity: params._id,
      },
      paginate,
    );
    return paginateHasNextPlainToClass(PaymentDto, paginateResult);
  }
}
