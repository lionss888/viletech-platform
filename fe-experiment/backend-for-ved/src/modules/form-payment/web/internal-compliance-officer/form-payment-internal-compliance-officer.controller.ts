import { Body, Controller, Get, Inject, Param, Put, Query, StreamableFile } from '@nestjs/common';
import { IFormPaymentService } from '../../service/form-payment.service.interface';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { InternalComplianceOfficerMethod } from '../../../../lib/decorators/internal-compliance-officer-method.decorator';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import {
  paginateHasNextPlainToClass,
  plainModelToClass,
  queryPaginateParser,
} from '../../../../lib/utils/helpers/entity.helper';
import { FormPaymentDto, FormPaymentWithAgentProviderDto } from '../../../../lib/dto/models/form-payment.dto';
import { CountFieldDto } from '../../../../lib/dto/count-field.dto';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { IFormPayment } from '../../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentStatus } from '../../../../lib/enums/models/form-payment.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { FORM_PAYMENT_SERVICE, formPaymentPopulate } from '../../form-payment.constants';
import { IGenerateDocsService } from '../../service/additional/generate-docs.service.interface';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';

@ApiCookieAuth()
@ApiTags('Internal compliance officer form payment')
@Controller('admin/internal-compliance-officer/form-payment')
export class FormPaymentInternalComplianceOfficerController {
  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
  ) {}

  @Get()
  @InternalComplianceOfficerMethod({
    summary: 'Возвращает заявки с пагинацией',
    hasNextPaginate: FormPaymentDto,
  })
  async findWithPaginate(@Query() dto: FormPaymentAdminPaginateDto) {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(FormPaymentDto, result);
  }

  @Get('count')
  @InternalComplianceOfficerMethod({
    summary: 'Возвращает количество заявок по фильтру',
    response: { status: 200, type: CountFieldDto },
  })
  async count(@Query() dto: FormPaymentQueryDto) {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('xlsx')
  @InternalComplianceOfficerMethod({
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
  @InternalComplianceOfficerMethod({
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
  @InternalComplianceOfficerMethod({
    summary: 'Возвращает заявку по id',
    response: { status: 200, type: FormPaymentWithAgentProviderDto },
  })
  async getAccount(@Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });
    return plainModelToClass(FormPaymentWithAgentProviderDto, model);
  }

  @Put(':_id/form/start')
  @InternalComplianceOfficerMethod({
    summary: 'Стартует рассмотрение заявки внутренним комплаенс офицером',
    response: { status: 200, type: FormPaymentDto },
  })
  async formStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ORGANIZATION_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/stop')
  @InternalComplianceOfficerMethod({
    summary: 'Останавливает рассмотрение заявки внутренним комплаенс офицером',
    response: { status: 200, type: FormPaymentDto },
  })
  async formStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/accept')
  @InternalComplianceOfficerMethod({
    summary: 'Подтверждение заявки со стороны внутреннего комплаенс офицера',
    response: { status: 200, type: FormPaymentDto },
  })
  async formAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_WAITING_VERIFICATION,
      rejectText: null,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/reject')
  @InternalComplianceOfficerMethod({
    summary: 'Возврат заявки клиенту со стороны внутреннего комплаенс офицера',
    response: { status: 200, type: FormPaymentDto },
  })
  async formReject(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto, @Body() { text }: TextFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/cancel')
  @InternalComplianceOfficerMethod({
    summary: 'Отклоняет заявку со стороны внутреннего комплаенс офицера',
    response: { status: 200, type: FormPaymentDto },
  })
  async formCancel(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto, @Body() { text }: TextFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }
}
