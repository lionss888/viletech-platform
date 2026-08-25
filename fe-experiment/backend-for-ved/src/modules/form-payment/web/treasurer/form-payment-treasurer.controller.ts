import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  getIdFromAccount,
  paginateHasNextPlainToClass,
  plainModelToClass,
  queryPaginateParser,
} from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { FormPaymentDto, FormPaymentWithAccountDocsDto } from '../../../../lib/dto/models/form-payment.dto';
import { IFormPayment } from '../../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentAdminPaginateDto, FormPaymentQueryDto } from '../../dto/form-payment.query.dto';
import { IFormPaymentService, IFormUpdate } from '../../service/form-payment.service.interface';
import { TreasurerMethod } from '../../../../lib/decorators/treasurer-method.decorator';
import { FORM_PAYMENT_SERVICE } from '../../form-payment.constants';
import {
  FormPaymentCondition,
  FormPaymentStatus,
  FormPaymentPaymentMethod,
} from '../../../../lib/enums/models/form-payment.enums';
import { TreasurerConfirmPaymentDto } from '../../dto/treasurer-confirm-payment.dto';
import { formPaymentPopulate } from '../../form-payment.constants';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FILE_SERVICE, uploadFileSizeLimit } from '../../../file/file.constants';
import { IFileService } from '../../../file/service/file.service.interface';
import { IS3Service } from '../../../../lib/modules/s3/s3.service.interface';
import { MimeTypes } from '../../../../lib/enums/common.enums';

@ApiCookieAuth()
@ApiTags('treasurer form payment')
@Controller('admin/treasurer/form-payment')
export class FormPaymentTreasurerController {
  private readonly logger = new Logger(FormPaymentTreasurerController.name);

  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
  ) {}

  @Get()
  @TreasurerMethod({ hasNextPaginate: FormPaymentDto })
  async findWithPaginate(@Query() dto: FormPaymentAdminPaginateDto): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { paginate, model } = queryPaginateParser(dto, FormPaymentQueryDto);

    const baseQuery: FormPaymentQueryDto = {
      ...model,
    };

    // Объединяем stage и stages в один массив stages
    if (model.stage) {
      baseQuery.stages = model.stages ? [...model.stages, model.stage] : [model.stage];
    }

    if (!model.status && !model.statuses?.length && !model.stage && !baseQuery.stages?.length) {
      baseQuery.statuses = [
        FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
        FormPaymentStatus.PAYMENT_SENT,
        FormPaymentStatus.REPORT_WAITING,
      ];
    }

    const result = await this.service.find(baseQuery, paginate);
    return paginateHasNextPlainToClass(FormPaymentDto, result);
  }

  @Get(':_id')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentWithAccountDocsDto } })
  async getById(@Param() dto: IdFieldDto): Promise<IFormPayment> {
    const model = await this.service.findOneOrException(dto, {
      include: [...formPaymentPopulate.toInclude(), 'payments'],
    });
    return plainModelToClass(FormPaymentWithAccountDocsDto, model);
  }

  @Patch(':_id/confirm-payment')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async confirmPayment(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() body: TreasurerConfirmPaymentDto,
  ): Promise<IFormPayment> {
    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    if (formPayment.platformPaymentCondition !== FormPaymentCondition.POST_PAYMENT) {
      throw new BadRequestException('Confirm payment available only for postpay forms');
    }

    const managerId = formPayment.manager ? getIdFromAccount(formPayment.manager) : null;

    if (managerId && ctx.accountId && String(managerId) === String(ctx.accountId)) {
      throw new BadRequestException('Treasurer cannot confirm payments for forms they manage');
    }

    const update: IFormUpdate = {
      dateReceiptOfCover: body.dateReceiptOfCover ?? formPayment.dateReceiptOfCover ?? new Date(),
      // При подтверждении платежа фиксируем факт оплаты комиссии (можно переопределить в теле запроса).
      feePaid: body.feePaid ?? true,
    };

    if (formPayment.status !== FormPaymentStatus.PAYMENT_RECEIVED) {
      update.prevStatus = formPayment.status;
      update.status = FormPaymentStatus.PAYMENT_RECEIVED;
    }

    const updated = await this.service.updateByAdmins(ctx, dto, update);
    return plainModelToClass(FormPaymentDto, updated);
  }

  private checkPaymentMethod(formPayment: IFormPayment): void {
    if (formPayment.paymentMethod !== FormPaymentPaymentMethod.PAY_FROM_EXPORT) {
      throw new BadRequestException('This action is available only for forms with paymentMethod = PAY_FROM_EXPORT');
    }
  }

  private async updateStatus(
    ctx: FeatureContext,
    dto: IdFieldDto,
    expectedStatus: FormPaymentStatus,
    newStatus: FormPaymentStatus,
  ): Promise<IFormPayment> {
    return this.updateStatusWithResolver(ctx, dto, expectedStatus, () => newStatus);
  }

  private async updateStatusWithResolver(
    ctx: FeatureContext,
    dto: IdFieldDto,
    expectedStatus: FormPaymentStatus,
    statusResolver: (formPayment: IFormPayment) => FormPaymentStatus,
  ): Promise<IFormPayment> {
    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    this.checkPaymentMethod(formPayment);

    // Валидация статуса будет выполнена в updateByAdmins через checkTransit
    // Но для более понятных сообщений об ошибках проверяем здесь
    if (formPayment.status !== expectedStatus) {
      const newStatus = statusResolver(formPayment);
      throw new BadRequestException(
        `Can not transit status from ${formPayment.status} to ${newStatus}. Expected status: ${expectedStatus}`,
      );
    }

    const update: IFormUpdate = {
      prevStatus: formPayment.status,
      status: statusResolver(formPayment),
    };

    const updated = await this.service.updateByAdmins(ctx, dto, update);
    return plainModelToClass(FormPaymentDto, updated);
  }

  @Put(':_id/signing-order-treasurer')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async setSigningOrderTreasurer(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    return this.updateStatus(
      ctx,
      dto,
      FormPaymentStatus.PAYMENT_SENT_TREASURER,
      FormPaymentStatus.SIGNING_ORDER_TREASURER,
    );
  }

  @Put(':_id/return-to-payment-sent-treasurer')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async returnToPaymentSentTreasurer(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
  ): Promise<IFormPayment> {
    return this.updateStatus(
      ctx,
      dto,
      FormPaymentStatus.SIGNING_ORDER_TREASURER,
      FormPaymentStatus.PAYMENT_SENT_TREASURER,
    );
  }

  @Put(':_id/order-waiting-correction-treasurer')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async setOrderWaitingCorrectionTreasurer(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @Body() { text }: TextFieldDto,
  ): Promise<IFormPayment> {
    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    this.checkPaymentMethod(formPayment);

    if (formPayment.status !== FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER) {
      throw new BadRequestException(
        `Can not transit status from ${formPayment.status} to ${FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER}. Expected status: ${FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER}`,
      );
    }

    const update: IFormUpdate = {
      prevStatus: formPayment.status,
      status: FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
      rejectText: text,
    };

    const updated = await this.service.updateByAdmins(ctx, dto, update);
    return plainModelToClass(FormPaymentDto, updated);
  }

  @Put(':_id/complete-from-verification-treasurer')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async completeFromVerificationTreasurer(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
  ): Promise<IFormPayment> {
    return this.updateStatusWithResolver(
      ctx,
      dto,
      FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
      (formPayment) =>
        this.service.isCorporateClient(formPayment) ? FormPaymentStatus.COMPLETED : FormPaymentStatus.PAYMENT_SENT,
    );
  }

  @Put(':_id/return-to-signing-order-treasurer')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  async returnToSigningOrderTreasurer(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
  ): Promise<IFormPayment> {
    return this.updateStatus(
      ctx,
      dto,
      FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
      FormPaymentStatus.SIGNING_ORDER_TREASURER,
    );
  }

  @Post(':_id/treasurer-order/upload')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: uploadFileSizeLimit, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Загрузить платежное поручение казначея',
    description:
      'Загружает PDF файл платежного поручения казначея в S3, создает запись в коллекции files и сохраняет ID в поле docs.treasurerOrder',
  })
  async uploadTreasurerOrder(
    @ReqContext() ctx: FeatureContext,
    @Param() dto: IdFieldDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: MimeTypes.PDF })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<IFormPayment> {
    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    this.checkPaymentMethod(formPayment);

    // Загружаем файл в S3 и создаем запись в коллекции files
    const uploadFile = await this.fileService.upload(file, { account: req.account._id, private: true });

    // Если уже есть старое поручение, удаляем его
    if (formPayment.docs?.treasurerOrder) {
      const oldFileId =
        typeof formPayment.docs.treasurerOrder === 'string'
          ? formPayment.docs.treasurerOrder
          : formPayment.docs.treasurerOrder._id?.toString();

      if (oldFileId) {
        await this.deleteTreasurerOrderFile(oldFileId);
      }
    }

    // Сохраняем ID нового файла в docs.treasurerOrder
    const update: IFormUpdate = {
      treasurerOrder: uploadFile._id.toString(),
    };

    const updated = await this.service.updateByAdmins(ctx, dto, update);
    return plainModelToClass(FormPaymentDto, updated);
  }

  @Delete(':_id/treasurer-order')
  @TreasurerMethod({ response: { status: 200, type: FormPaymentDto } })
  @ApiOperation({
    summary: 'Удалить платежное поручение казначея',
    description: 'Удаляет платежное поручение казначея из S3, базы данных и очищает поле docs.treasurerOrder',
  })
  async deleteTreasurerOrder(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    this.checkPaymentMethod(formPayment);

    if (!formPayment.docs?.treasurerOrder) {
      throw new NotFoundException('Treasurer order not found');
    }

    const fileId =
      typeof formPayment.docs.treasurerOrder === 'string'
        ? formPayment.docs.treasurerOrder
        : formPayment.docs.treasurerOrder._id?.toString();

    if (!fileId) {
      throw new NotFoundException('Treasurer order file ID not found');
    }

    // Удаляем файл из S3 и базы данных
    await this.deleteTreasurerOrderFile(fileId);

    // Очищаем поле docs.treasurerOrder
    const update: IFormUpdate = {
      treasurerOrder: null,
    };

    const updated = await this.service.updateByAdmins(ctx, dto, update);
    return plainModelToClass(FormPaymentDto, updated);
  }

  private async deleteTreasurerOrderFile(fileId: string): Promise<void> {
    // Сначала удаляем запись из базы данных (критично)
    try {
      await this.fileService.deleteOne({ _id: fileId });
    } catch (error) {
      this.logger.error(`Failed to delete file DB record ${fileId}: ${error.message}`);
      throw new BadRequestException('Failed to delete file metadata.');
    }

    // Затем удаляем файл из S3 (не критично, только предупреждение)
    const pathName = `fea/documents/${fileId}`;
    try {
      await this.s3Service.deleteFile(pathName);
      this.logger.log(`Treasurer order file deleted: ${fileId}`);
    } catch (error) {
      this.logger.warn(`S3 deletion failed for ${fileId}: ${error.message}. File metadata removed, S3 cleanup needed.`);
    }
  }
}
