import { Body, Controller, Get, Inject, Param, Patch, Put, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import { IFormPaymentService } from '../../service/form-payment.service.interface';
import { Request } from 'express';
import { FormPaymentCondition, FormPaymentStatus } from '../../../../lib/enums/models/form-payment.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { ProviderMethod } from '../../../../lib/decorators/provider-method.decorator';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import {
  FormPaymentProviderUpdateDto,
  FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
} from '../../dto/form-payment.update.dto';
import { formPaymentPopulate } from '../../form-payment.constants';
import { IGenerateDocsService } from '../../service/additional/generate-docs.service.interface';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';
import {
  FormPaymentProviderViewDto,
  toFormPaymentProviderView,
  toFormPaymentProviderViewPage,
} from '../../dto/form-payment-provider.view.dto';

@ApiCookieAuth()
@ApiTags('provider form payment')
@Controller('admin/provider/form-payment')
export class FormPaymentProviderController {
  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
  ) {}

  @Get()
  @ProviderMethod({ hasNextPaginate: FormPaymentProviderViewDto })
  async findWithPaginate(
    @Req() req: Request,
    @Query() dto: FormPaymentAdminPaginateDto,
  ): Promise<IPaginateHasNextResult<FormPaymentProviderViewDto>> {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);
    const result = await this.service.find({ provider: req.account._id, ...model }, paginate);
    return toFormPaymentProviderViewPage(result);
  }

  @Get('count')
  @ProviderMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Req() req: Request, @Query() dto: FormPaymentQueryDto): Promise<ICountField> {
    const result = await this.service.count({ provider: req.account._id, ...dto });
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('xlsx')
  @ProviderMethod({
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
  @ProviderMethod({
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
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async getAccount(@Req() req: Request, @Param() dto: IdFieldDto): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.findOneOrException(
      { provider: req.account._id, ...dto },
      {
        include: formPaymentPopulate.toInclude(),
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Patch(':_id')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async patchById(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentProviderUpdateDto,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(ctx, { account: req.account._id, ...dto }, updateDto);
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/payment/received')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async paymentReceived(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status: FormPaymentStatus.PAYMENT_RECEIVED,
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/payment/start')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async paymentStart(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status: FormPaymentStatus.PAYMENT_PROCESSING,
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/payment/stop')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async paymentStop(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() { platformPaymentCondition }: FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status:
          platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
            ? FormPaymentStatus.SIGNING_ORDER_ACCEPTED
            : FormPaymentStatus.PAYMENT_RECEIVED,
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/payment/sent')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async paymentSent(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
  ): Promise<FormPaymentProviderViewDto> {
    const formPayment = await this.service.findOneOrException(
      { provider: req.account._id, ...dto },
      {
        include: formPaymentPopulate.toInclude(),
      },
    );
    const exportAmount = formPayment.linkedExportFormsTotalAmount || 0;
    const importAmount = formPayment.totals?.amount || 0;
    const newStatus =
      exportAmount > importAmount ? FormPaymentStatus.PAYMENT_SENT_TREASURER : FormPaymentStatus.PAYMENT_SENT;
    const model = await this.service.updateByAdmins(
      ctx,
      { provider: req.account._id, ...dto },
      {
        prevStatus: formPayment.status,
        status: newStatus,
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/payment/cancel')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async paymentReject(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body()
    { text, platformPaymentCondition }: TextFieldDto & FormPaymentUpdateWithPlatformPaymentConditionAndDirection,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status:
          platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
            ? FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED
            : FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
        rejectText: text,
        isPaymentCancel: true,
      },
    );
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/make-important')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async makeImportant(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      isImportant: true,
    });
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/make-unimportant')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async makeUnimportant(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto) {
    const model = await this.service.updateByAdmins(ctx, dto, {
      isImportant: false,
    });
    return toFormPaymentProviderView(model);
  }

  @Put(':_id/form/manager')
  @ProviderMethod({ response: { status: 200, type: FormPaymentProviderViewDto } })
  async formReject(
    @ReqContext() ctx: FeatureContext,
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<FormPaymentProviderViewDto> {
    const model = await this.service.updateByAdmins(
      ctx,
      { account: req.account._id, ...dto },
      {
        status: FormPaymentStatus.MANAGER_CHECKING,
        rejectText: text,
      },
    );
    return toFormPaymentProviderView(model);
  }
}
