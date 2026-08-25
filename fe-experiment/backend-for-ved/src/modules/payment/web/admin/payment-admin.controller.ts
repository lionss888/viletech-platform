import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Inject, Query } from '@nestjs/common';
import { PAYMENT_SERVICE } from '../../payment.constants';
import { IPaymentService } from '../../service/payment.service.interface';
import { RootMethod } from '../../../../lib/decorators/root-method.decorator';
import { PaymentDto } from '../../../../lib/dto/models/payment.dto';
import { PaymentAdminPaginateDto, PaymentAdminQueryDto } from '../../dto/payment.query.dto';
import { paginateHasNextPlainToClass, queryPaginateParser } from '../../../../lib/utils/helpers/entity.helper';
import { IPaginateHasNextResult } from '../../../../lib/interfaces/paginate.interface';
import { IPayment } from '../../../../lib/interfaces/models/payment.interface';

@ApiCookieAuth()
@ApiTags('admin payment')
@Controller('admin/payment')
export class PaymentAdminController {
  constructor(@Inject(PAYMENT_SERVICE) private readonly service: IPaymentService) {}

  @Get()
  @RootMethod({ hasNextPaginate: PaymentDto })
  async findWithPaginate(@Query() dto: PaymentAdminPaginateDto): Promise<IPaginateHasNextResult<IPayment>> {
    const { paginate, model } = queryPaginateParser(dto, PaymentAdminQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(PaymentDto, result);
  }

  @Delete()
  @RootMethod({})
  async delete(@Body() dto: PaymentAdminQueryDto): Promise<void> {
    await this.service.deleteMany(dto);
  }
}
