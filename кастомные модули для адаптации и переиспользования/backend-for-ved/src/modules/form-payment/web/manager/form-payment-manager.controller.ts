import { Body, Controller, Get, Inject, NotFoundException, Optional, Param, Patch, Post, Put, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import {
  FormPaymentDto,
  FormPaymentWithAccountDocsDto,
  FormPaymentWithAgentProviderDto,
} from '../../../../lib/dto/models/form-payment.dto';
import { IFormPayment } from '../../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import { IFormPaymentService } from '../../service/form-payment.service.interface';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';
import { Request } from 'express';
import { FormPaymentCondition, FormPaymentDirection, FormPaymentStatus } from '../../../../lib/enums/models/form-payment.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import {
  FormPaymentAdminUpdateDto,
  FormPaymentAdminUpdateReportDto,
  FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  GenerateOrderDto,
} from '../../dto/form-payment.update.dto';
import { FixRateDto } from '../../dto/fix-rate.dto';
import { GenerateAgentReportDto } from '../../dto/generate-agent-report.dto';
import { IGenerateDocsService } from 'modules/form-payment/service/additional/generate-docs.service.interface';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import { formPaymentPopulate } from '../../form-payment.constants';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';
import { IDiadocService, DiadocDocumentStatus } from '../../../diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../../diadoc/diadoc.constants';
import { DiadocStatusResponseDto } from '../../../diadoc/dto/diadoc-status.dto';
import { FormPaymentSignViaDiadocDto } from '../../dto/form-payment.update.dto';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';

@ApiCookieAuth()
@ApiTags('manager form payment')
@Controller('admin/manager/form-payment')
export class FormPaymentManagerController {
  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
  ) {}

  @Get()
  @ManagerMethod({ hasNextPaginate: FormPaymentDto })
  async findWithPaginate(@Query() dto: FormPaymentAdminPaginateDto): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(FormPaymentDto, result);
  }

  @Get('count')
  @ManagerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: FormPaymentQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('xlsx')
  @ManagerMethod({
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
  @ManagerMethod({
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
  @ManagerMethod({ response: { status: 200, type: FormPaymentWithAgentProviderDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.findOneOrExceptionForManager(dto, {
      include: formPaymentPopulate.toInclude(),
    });
    return plainModelToClass(FormPaymentWithAgentProviderDto, model);
  }

  @Patch(':_id')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async patchById(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentAdminUpdateDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, { account: req.account._id, ...dto }, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Patch(':_id/rate')
  @ManagerMethod({
    summary: 'Зафиксировать курс и комиссию по заявке (auto по правилам аккаунта или manual)',
    response: { status: 200, type: FormPaymentDto },
  })
  async fixRate(@Param() dto: IdFieldDto, @Body() body: FixRateDto): Promise<IFormPayment> {
    const model = await this.service.fixRate(dto._id, body);
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
        роуты формы
        */
  @Put(':_id/completed')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formCompleted(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.COMPLETED });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/reject')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
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

  @Put(':_id/form/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.FORM_VERIFICATION });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.FORM_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/accept')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.FORM_ACCEPTED });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/cancel')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formCancel(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.CANCELED_BY_MANAGER,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/make-important')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async makeImportant(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      isImportant: true,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/make-unimportant')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async makeUnimportant(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      isImportant: false,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
        роуты поручение
        */
  @Put(':_id/order/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.SIGNING_ORDER_VERIFICATION });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order/accept')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order/reject')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderReject(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order/signing')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderSign(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SIGNING_ORDER,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order/generate')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderGenerate(@Param() dto: IdFieldDto, @Body() data: GenerateOrderDto) {
    const model = await this.generateDocsService.generateOrder({ ...dto, ...data });
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
        роуты доп поручение
        */
  @Put(':_id/order-advance/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order-advance/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order-advance/accept')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order-advance/reject')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceReject(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Принудительный откат ордера для редактирования
  @Put(':_id/order-advance/revoke')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceRevoke(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { direction }: FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status:
        direction === FormPaymentDirection.EXPORT ? FormPaymentStatus.PAYMENT_RECEIVED : FormPaymentStatus.PAYMENT_SENT,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order-advance/signing')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async orderAdvanceSign(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payment/received')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async paymentReceived(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_RECEIVED,
      rejectText: null,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payment/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async paymentStop(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status: FormPaymentStatus.PAYMENT_RECEIVED,
      },
    );
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payment/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async paymentStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_PROCESSING,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Специальная ручка: менеджер явно возвращает заявку
  // из MANAGER_CHECKING обратно в PAYMENT_SENT, если документы не устроили.
  @Put(':_id/payment/return-to-sent')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async paymentReturnToSent(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_SENT,
      isManagerReturnToPaymentSent: true,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payment/sent')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async paymentSent(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_SENT,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payment/cancel')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async formPaymentCancel(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
        роуты отгрузки
        */
  @Put(':_id/shipment/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async shipmentStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.SHIPMENT_VERIFICATION });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/shipment/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async shipmentStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/shipment/accept')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async shipmentAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.COMPLETED,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/shipment/reject')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async shipmentReject(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  /*
        роуты отчета
        */

  @Put(':_id/report/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, { status: FormPaymentStatus.REPORT_VERIFICATION });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/report/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.REPORT_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/report/accept')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportAccept(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.REPORT_ACCEPTED,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/report/reject')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportReject(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // отозвать отчет для редактирования
  @Put(':_id/report/revoke')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportRevoke(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { platformPaymentCondition }: FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status:
        platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
          ? FormPaymentStatus.PAYMENT_RECEIVED
          : FormPaymentStatus.PAYMENT_SENT,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/report/signing')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async reportSign(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.REPORT_WAITING,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // VF-2: Отправка отчёта на подписание через Diadoc
  @Post(':_id/report/sign-via-diadoc')
  @ApiBadRequestMessagesResponse([
    'Diadoc integration is not enabled',
    'Report not found',
    'Report already sent to Diadoc',
    'Report already signed manually',
    'Report file not found',
    'Recipient INN is required',
    'Failed to upload document to Diadoc',
    'Failed to send document for signing to Diadoc',
  ])
  @ManagerMethod({
    summary: 'Отправить отчёт на подписание через Diadoc',
    response: { status: 200, type: FormPaymentDto },
  })
  async signReportViaDiadoc(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() body: FormPaymentSignViaDiadocDto,
  ): Promise<IFormPayment> {
    const model = await this.service.signReportViaDiadoc(dto, body.recipientInn || '');
    return plainModelToClass(FormPaymentDto, model);
  }

  // VF-2: Получение статуса отчёта в Diadoc
  @Get(':_id/report/diadoc-status')
  @ApiBadRequestMessagesResponse(['Diadoc service is not available'])
  @ManagerMethod({
    summary: 'Получить статус отчёта в Diadoc',
    response: { status: 200, type: DiadocStatusResponseDto },
  })
  async getReportDiadocStatus(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
  ): Promise<DiadocStatusResponseDto> {
    if (!this.diadocService) {
      throw new NotFoundException('Diadoc service is not available');
    }

    const formPayment = await this.service.findOneOrException({ _id: dto._id });
    const documentId = (formPayment.docs as any)?.reportDiadocDocumentId;

    if (!documentId) {
      return { status: DiadocDocumentStatus.DRAFT };
    }

    const status = await this.diadocService.getDocumentStatus(documentId);
    return {
      status,
      documentId,
      messageId: (formPayment.docs as any)?.reportDiadocMessageId,
    };
  }

  @Put(':_id/report')
  @ManagerMethod({
    summary: 'добавить подписанный отчет, переводит заявку на этап документов об отгрузке',
    response: { status: 200, type: FormPaymentDto },
  })
  async updateReport(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentAdminUpdateReportDto,
  ): Promise<IFormPayment> {
    const model = await this.service.reportByAdmin(dto, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Post(':_id/generate-agent-report')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  @ApiResponse({
    status: 201,
    description: 'Отчет агента успешно сгенерирован',
  })
  async generateAgentReport(
    @Req() req: Request,
    @Param('_id') _id: string,
    @Body() dto: GenerateAgentReportDto,
  ): Promise<IFormPayment> {
    const model = await this.generateDocsService.generateAgentReport({ _id, account: req.account._id }, dto);
    return plainModelToClass(FormPaymentWithAccountDocsDto, model);
  }

  // Роуты возврата средств

  // инициализация возврата средств
  @Put(':_id/refund/init')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async refundInit(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_REFUND_WAITING,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Отмена возврата, возвращение заявки в работу
  @Put(':_id/refund/cancel')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async refundCancel(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body()
    { platformPaymentCondition }: FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  ): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status:
        platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
          ? FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED
          : FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      rejectText: null,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Менеджер начал возврат средств
  @Put(':_id/refund/start')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async refundStart(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_REFUND_PROCESSING,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Менеджер остановил возврат средств
  @Put(':_id/refund/stop')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async refundStop(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_REFUND_WAITING,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Возврат средств завершен
  @Put(':_id/refund/sent')
  @ManagerMethod({ response: { status: 200, type: FormPaymentDto } })
  async refundSent(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.updateByAdmins(ctx, dto, {
      status: FormPaymentStatus.PAYMENT_REFUND_SENT,
      // feePaid: false,
    });
    return plainModelToClass(FormPaymentDto, model);
  }
}
