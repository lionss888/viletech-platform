import { Body, Controller, Get, Inject, Param, Patch, Query, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { RootMethod } from 'lib/decorators/root-method.decorator';
import { FormPaymentDto } from '../../../../lib/dto/models/form-payment.dto';
import { IFormPayment } from '../../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import { IFormPaymentService } from '../../service/form-payment.service.interface';
import { FormPaymentAdminUpdateDto } from '../../dto/form-payment.update.dto';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import { IGenerateDocsService } from '../../service/additional/generate-docs.service.interface';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';

@ApiCookieAuth()
@ApiTags('admin form payment')
@Controller('admin/form-payment')
export class FormPaymentAdminController {
  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
  ) {}

  @Get()
  @RootMethod({ hasNextPaginate: FormPaymentDto })
  async findWithPaginate(@Query() dto: FormPaymentAdminPaginateDto): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(FormPaymentDto, result);
  }

  @Get('count')
  @RootMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: FormPaymentQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('xlsx')
  @RootMethod({
    response: {
      status: 200,
      description: 'Return stream file',
    },
  })
  async generateFormPaymentsXLSX(@Query() dto: FormPaymentAdminPaginateDto) {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const stream = await this.generateDocsService.generateFormPayments(model, paginate);
    const filename = encodeURIComponent(`Детализация платежей.xlsx`);
    return new StreamableFile(stream, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename=${filename}`,
    });
  }

  @Get(':_id/xlsx')
  @RootMethod({
    response: {
      status: 200,
      description: 'Return stream file',
    },
  })
  async generateFormPaymentXLSX(@Param() dto: IdFieldDto) {
    const stream = await this.generateDocsService.generateFormPayments(dto);
    const filename = encodeURIComponent(`Детализация платежа.xlsx`);
    return new StreamableFile(stream, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename=${filename}`,
    });
  }

  @Get(':_id')
  @RootMethod({ response: { status: 200, type: FormPaymentDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.findOneOrException(dto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Patch(':_id')
  @RootMethod({ response: { status: 200, type: FormPaymentDto } })
  patchById(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentAdminUpdateDto,
  ): Promise<IFormPayment> {
    return this.service.updateByAdmins(ctx, dto, updateDto);
  }
}
