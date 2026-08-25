import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { FormPaymentDto, FormPaymentWithAgentProviderDto } from '../../../../lib/dto/models/form-payment.dto';
import { IFormPayment } from '../../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import { IFormPaymentService } from '../../service/form-payment.service.interface';
import { FormPaymentStatus } from '../../../../lib/enums/models/form-payment.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { FormPaymentAdminUpdateDto } from '../../dto/form-payment.update.dto';
import { ComplianceOfficerMethod } from 'lib/decorators/compliance-officer-method.decorator';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import { formPaymentPopulate } from '../../form-payment.constants';
import { IGenerateDocsService } from '../../service/additional/generate-docs.service.interface';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';

@ApiCookieAuth()
@ApiTags('compliance officer form payment')
@Controller('admin/compliance-officer/form-payment')
export class FormPaymentComplianceOfficerController {
  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
  ) {}

  @Get()
  @ComplianceOfficerMethod({ hasNextPaginate: FormPaymentDto })
  async findWithPaginate(@Query() dto: FormPaymentAdminPaginateDto): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(FormPaymentDto, result);
  }

  @Get('count')
  @ComplianceOfficerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: FormPaymentQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('xlsx')
  @ComplianceOfficerMethod({
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
  @ComplianceOfficerMethod({
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
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentWithAgentProviderDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });
    return plainModelToClass(FormPaymentWithAgentProviderDto, model);
  }

  @Patch(':_id')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async patchById(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentAdminUpdateDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, { account: req.account._id, ...dto }, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
  роуты формы
  */

  @Put(':_id/cancel')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formCancel(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/start')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.FORM_VERIFICATION });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/stop')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/accept')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const validation = await this.service.validateHsCodesForApproval(dto._id);

    if (!validation.valid) {
      throw new BadRequestException({
        message: validation.errors.join(', '),
        code: 'HS_CODES_VALIDATION_FAILED',
        errors: validation.errors,
      });
    }

    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_ACCEPTED,
      rejectText: null,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/reject')
  @ComplianceOfficerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formReject(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Повторная генерация отчета по контрагенту через ChatGPT
  @Post(':_id/analyze-counterparty')
  @ComplianceOfficerMethod({
    summary: 'Повторить запрос к ChatGPT для генерации отчета по контрагенту',
    response: { status: 200, type: String },
  })
  @ApiResponse({
    status: 200,
    description: 'Запрос на анализ контрагента через ChatGPT успешно добавлен в очередь',
  })
  async analyzeCounterparty(@Req() req: Request, @Param() dto: IdFieldDto): Promise<{ jobId: string }> {
    const jobId = await this.service.analyzeCounterpartyWithChatGpt(dto._id);
    return { jobId };
  }
}
