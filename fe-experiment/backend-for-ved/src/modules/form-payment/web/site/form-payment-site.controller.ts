import { Request } from 'express';
import {
  FormPaymentByOrderAcceptedDto,
  FormPaymentDto,
  FormPaymentWithAccountDocsDto,
} from 'lib/dto/models/form-payment.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Optional,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { IFormPaymentService, IFormPaymentQuery } from '../../service/form-payment.service.interface';
import { ApiCookieAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { FilterQuery } from 'mongoose';
import { FormPayment } from '../../service/form-payment.schema';
import {
  paginateHasNextPlainToClass,
  plainModelToClass,
  plainModelToClassArray,
  queryPaginateParser,
} from 'lib/utils/helpers/entity.helper';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import {
  FormPaymentByOrderAcceptedPaginateDto,
  FormPaymentByOrderAcceptedQuery,
  FormPaymentSitePaginateDto,
  FormPaymentSiteQueryDto,
} from '../../dto/form-payment.query.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { FormPaymentCreateDto } from '../../dto/form-payment.create.dto';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import {
  FormPaymentUserUpdateAdditionalDto,
  FormPaymentUserUpdateClosingDto,
  FormPaymentUserUpdateDto,
  FormPaymentUserUpdateOrderDto,
  FormPaymentUserUpdatePaymentsDto,
  FormPaymentUserUpdateReportDto,
} from '../../dto/form-payment.update.dto';
import { FormPaymentCopyDto, FormPaymentCopyResponseDto } from '../../dto/form-payment.copy.dto';
import { FormPaymentDirection, FormPaymentStatus, FormPaymentPaymentMethod } from 'lib/enums/models/form-payment.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { Method } from '../../../../lib/decorators/method.decorator';
import { ApiForbiddenMessagesResponse } from '../../../../lib/decorators/api-forbidden-messages-response.decorator';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import { formPaymentPopulate } from '../../form-payment.constants';
import { IFormPaymentExcelService } from '../../service/form-payment-excel.service.interface';
import { FormPaymentImportDto } from '../../dto/form-payment-import.dto';
import { UpdateInvoiceHsCodesDto } from '../../dto/update-invoice-hs-codes.dto';
import { AddInvoiceDto, UpdateInvoiceDto } from '../../dto/invoice.manage.dto';
import { FixRateDto } from '../../dto/fix-rate.dto';
import { IOrganizationService } from '../../../organization/service/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../../../organization/organization.constants';
import { OrganizationSubaccountStatusType } from 'lib/enums/models/organization.enums';
import { BadRequestException } from '@nestjs/common';
import * as _ from 'lodash';

/**
 * Тип для условий $or в запросе с учетом доступа к организациям
 */
type OrganizationAccessCondition = { account: string } | { 'organization.refOrganizationId': { $in: string[] } };
import { AllCurrencies } from '../../../../lib/enums/common.enums';
import { IDiadocService, DiadocDocumentStatus } from '../../../diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../../diadoc/diadoc.constants';
import { DiadocStatusResponseDto } from '../../../diadoc/dto/diadoc-status.dto';
import { FormPaymentSignViaDiadocDto } from '../../dto/form-payment.update.dto';
import { FormPaymentSignMethodDto, FormPaymentSignMethodResponseDto } from '../../dto/form-payment-sign-method.dto';

@ApiExtraModels(FormPaymentDto)
@ApiCookieAuth()
@ApiTags('form-payment')
@Controller('form-payment')
export class FormPaymentSiteController {
  private readonly logger = new Logger(FormPaymentSiteController.name);

  constructor(
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject('IFormPaymentExcelService')
    private readonly excelService: IFormPaymentExcelService,
    @Inject(ORGANIZATION_SERVICE) private readonly organizationService: IOrganizationService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
  ) {}

  /**
   * Получает список ID организаций, к которым у пользователя есть доступ:
   * - где пользователь является активным сабаккаунтом
   * - где пользователь является владельцем (account)
   * @param accountId ID аккаунта пользователя
   * @returns Массив ID организаций
   */
  private async getAccessibleOrganizationIds(accountId: string): Promise<string[]> {
    // Объединяем запросы в один: сервис автоматически создаст $or условие
    // для поиска организаций, где пользователь либо владелец, либо сабаккаунт
    const organizations = await this.organizationService.findMany({
      account: accountId,
      subaccount: accountId,
      isActive: true,
    });

    return organizations.map((org) => org._id.toString());
  }

  /**
   * Формирует запрос для поиска сделок с учетом доступа к организациям
   * (сабаккаунты и владельцы организаций)
   * @param baseQuery Базовый запрос
   * @param accountId ID аккаунта пользователя
   * @returns Запрос с учетом доступа к организациям
   */
  private async buildQueryWithOrganizationAccess(
    baseQuery: Partial<IFormPaymentQuery>,
    accountId: string,
  ): Promise<FilterQuery<FormPayment>> {
    const organizationIds = await this.getAccessibleOrganizationIds(accountId);

    const query: FilterQuery<FormPayment> = {
      ...baseQuery,
      account: accountId,
    } as FilterQuery<FormPayment>;

    // Если пользователь имеет доступ к каким-то организациям, добавляем их в условие
    if (organizationIds.length > 0) {
      const orConditions: OrganizationAccessCondition[] = [
        { account: accountId },
        { 'organization.refOrganizationId': { $in: organizationIds } },
      ];
      (query as FilterQuery<FormPayment> & { $or: OrganizationAccessCondition[] }).$or = orConditions;
      delete query.account;
    }

    return query;
  }

  /**
   * Проверяет, имеет ли пользователь доступ к организации
   * (является сабаккаунтом или владельцем)
   * @param organizationId ID организации
   * @param accountId ID аккаунта пользователя
   * @returns true, если пользователь имеет доступ
   */
  private async hasOrganizationAccess(organizationId: string, accountId: string): Promise<boolean> {
    // Находим организацию с заполненными subaccounts и account
    // Проверяем isActive для безопасности
    const org = await this.organizationService.findOne(
      { _id: organizationId, isActive: true },
      { include: ['subaccounts.account', 'account'] },
    );

    if (!org) {
      return false;
    }

    // Проверяем, является ли пользователь сабаккаунтом этой организации
    const isSubaccount = _.some(
      org.subaccounts,
      (subaccount) =>
        (typeof subaccount.account === 'string' ? subaccount.account : subaccount.account._id.toString()) ===
          accountId.toString() && subaccount.status === OrganizationSubaccountStatusType.ACTIVE,
    );

    // Проверяем, является ли пользователь владельцем этой организации
    const isOwner =
      org.account &&
      (typeof org.account === 'string' ? org.account : org.account._id.toString()) === accountId.toString();

    return isSubaccount || isOwner;
  }

  /**
   * Проверяет доступ пользователя к сделке (включая проверку сабаккаунта и владельца организации)
   * @param formPaymentId ID сделки
   * @param accountId ID аккаунта пользователя
   * @returns Сделка, если доступ разрешен
   * @throws NotFoundException если доступ запрещен
   */
  private async checkFormPaymentAccess(formPaymentId: string, accountId: string): Promise<IFormPayment> {
    // Сначала получаем сделку по ID
    const formPayment = await this.service.findOne({ _id: formPaymentId });

    if (!formPayment) {
      throw new NotFoundException('FormPayment not found.');
    }

    // Проверяем прямой доступ (сделка принадлежит пользователю)
    const formAccountId =
      typeof formPayment.account === 'string' ? formPayment.account : formPayment.account?._id?.toString();
    if (formAccountId === accountId.toString()) {
      return formPayment;
    }

    // Проверяем доступ через организацию
    const organization = formPayment.organization;
    if (!organization) {
      throw new NotFoundException('FormPayment not found.');
    }

    // Получаем ID организации для проверки доступа
    let organizationId: string | undefined;

    if (typeof organization === 'string') {
      // Если organization - это строка (ID организации напрямую)
      organizationId = organization;
    } else {
      // Если organization - это объект, проверяем refOrganizationId
      organizationId = organization.refOrganizationId;
    }

    if (organizationId) {
      const hasAccess = await this.hasOrganizationAccess(organizationId, accountId);
      if (hasAccess) {
        return formPayment;
      }
    }

    throw new NotFoundException('FormPayment not found.');
  }

  @Get()
  @UserMethod({
    summary: 'список заявок с пагинацией',
    hasNextPaginate: FormPaymentDto,
  })
  async findWithPaginate(
    @Req() req: Request,
    @Query() dto: FormPaymentSitePaginateDto,
  ): Promise<IPaginateHasNextResult<IFormPayment>> {
    const { model, paginate } = queryPaginateParser(dto, FormPaymentSiteQueryDto);
    const query = await this.service.buildQueryWithOrganizationAccess(model, req.account._id);
    const paginateResult = await this.service.find(query, { ...paginate });
    return paginateHasNextPlainToClass(FormPaymentDto, paginateResult);
  }

  @Get('count')
  @UserMethod({
    summary: 'общее количество',
    response: { status: 201, type: CountFieldDto },
  })
  async count(@Req() req: Request, @Query() dto: FormPaymentSiteQueryDto): Promise<CountFieldDto> {
    const query = await this.service.buildQueryWithOrganizationAccess(dto, req.account._id);
    const model = await this.service.count(query);
    return plainModelToClass(CountFieldDto, model);
  }

  @Get('export/payment-received')
  @UserMethod({
    summary: 'список экспортных заявок пользователя со статусом payment_received',
    response: { status: 200, type: [FormPaymentDto] },
  })
  async findExportPaymentReceived(
    @Req() req: Request,
    @Query('convertToCurrency') convertToCurrency?: AllCurrencies,
  ): Promise<FormPaymentDto[]> {
    const forms = await this.service.findMany(
      {
        account: req.account._id,
        organizationSubaccount: req.account._id,
        direction: FormPaymentDirection.EXPORT,
        statuses: [FormPaymentStatus.PAYMENT_RECEIVED],
        isFreeze: { $ne: true },
        isAvailable: { $ne: false },
      },
      {
        sort: { createDate: -1 }, // Сортировка по дате создания (от новых к старым)
      },
    );

    const formsDto = plainModelToClassArray(FormPaymentDto, forms);

    // Если указана целевая валюта, конвертируем amount для каждой сделки
    if (convertToCurrency) {
      await Promise.all(
        formsDto.map(async (formDto, index) => {
          const form = forms[index];
          formDto.convertedAmount = await this.service.convertFormAmountToCurrency(form, convertToCurrency);
        }),
      );
    }

    return formsDto;
  }

  @Get('by-order-accepted')
  @Method({
    summary: 'Возвращает заявки для которых isOrderAccepted = true',
    hasNextPaginate: FormPaymentByOrderAcceptedDto,
  })
  async findByOrderAccepted(@Query() dto: FormPaymentByOrderAcceptedPaginateDto) {
    const { model, paginate } = queryPaginateParser(dto, FormPaymentByOrderAcceptedQuery);
    const paginateResult = await this.service.findForLiquidityGlass(model, paginate);
    return paginateHasNextPlainToClass(FormPaymentByOrderAcceptedDto, paginateResult);
  }

  @Get('by-order-accepted/count')
  @Method({
    summary: 'Возвращает количество заявок, для которых isOrderAccepted = true',
    response: { status: 201, type: CountFieldDto },
  })
  async countByOrderAccepted(@Query() dto: FormPaymentByOrderAcceptedQuery) {
    const model = await this.service.count({ ...dto, isOrderAccepted: true });
    return plainModelToClass(CountFieldDto, model);
  }

  @Get(':_id')
  @ApiNotFoundMessagesResponse(['FormPayment not found.'])
  @UserMethod({
    summary: 'посмотреть заявку по _id',
    response: { status: 201, type: FormPaymentWithAccountDocsDto },
  })
  async getAccount(@Req() req: Request, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    try {
      await this.checkFormPaymentAccess(dto._id, req.account._id);
      const model = await this.service.findOneOrException(
        { _id: dto._id },
        {
          include: formPaymentPopulate
            .except('account', 'provider', 'docs.paymentOrderDocx', 'docs.docxFile')
            .toInclude(),
        },
      );
      this.logger.debug(
        `getAccount: model received, _id: ${model?._id}, task type: ${typeof model?.task}, task: ${JSON.stringify(
          model?.task,
        )}`,
      );
      return plainModelToClass(FormPaymentWithAccountDocsDto, model);
    } catch (error) {
      this.logger.error(`Error in getAccount for _id: ${dto._id}, error: ${error.message}, stack: ${error.stack}`);
      throw error;
    }
  }

  @Post('')
  @ApiBadRequestMessagesResponse(['Invoice must be pdf'])
  @UserMethod({
    summary: 'создание заявки',
    response: { status: 201, type: FormPaymentDto },
  })
  async create(@Req() req: Request, @Body() dto: FormPaymentCreateDto): Promise<IFormPayment> {
    const model = await this.service.create({
      ...dto,
      account: req.account._id,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Patch(':_id/rate')
  @UserMethod({
    summary: 'зафиксировать курс и комиссию по заявке по текущим настройкам аккаунта',
    response: { status: 200, type: FormPaymentDto },
  })
  async fixRate(@Req() req: Request, @Param() dto: IdFieldDto, @Body() body: FixRateDto): Promise<IFormPayment> {
    // Ensure the form belongs to the current user, subaccount, or organization owner
    await this.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.fixRate(dto._id, body);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Patch(':_id/form')
  @ApiBadRequestMessagesResponse([
    'Can not modify form payment',
    'Can not change direction when form payment in form_waiting_corrections status',
  ])
  @ApiForbiddenMessagesResponse(['Compliance officer has not yet verified the form payment'])
  @UserMethod({
    summary: 'редактирование заявки',
    response: { status: 201, type: FormPaymentDto },
  })
  async patchForm(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.updateFormByUser(dto, updateDto);

    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/cancel')
  @UserMethod({
    summary: 'отменить заявку',
    response: { status: 200, type: FormPaymentDto },
  })
  async cancel(@Req() req: Request, @Param() dto: IdFieldDto, @Body() { text }: TextFieldDto): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.cancelFormByUser(dto, {
      status: FormPaymentStatus.CANCELED_BY_USER,
      rejectText: text,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/payments')
  @UserMethod({
    summary: 'добавить или удалить документы о платежах',
    response: { status: 200, type: FormPaymentDto },
  })
  async updatePayments(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdatePaymentsDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.updatePaymentsByUser(dto, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/form/accept')
  @UserMethod({
    summary: 'отправить заявку на проверку внутреннему комплаенс офицеру',
    response: { status: 200, type: FormPaymentDto },
  })
  async formAccept(@Req() req: Request, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    try {
      await this.checkFormPaymentAccess(dto._id, req.account._id);

      const model = await this.service.updateFormByUser(dto, {
        status: FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
      });
      this.logger.debug(
        `formAccept: model received, _id: ${model?._id}, task type: ${typeof model?.task}, task: ${JSON.stringify(
          model?.task,
        )}`,
      );
      return plainModelToClass(FormPaymentDto, model);
    } catch (error) {
      this.logger.error(`Error in formAccept for _id: ${dto._id}, error: ${error.message}, stack: ${error.stack}`);
      throw error;
    }
  }

  @Put(':_id/form/accept-corrections')
  @UserMethod({
    summary: 'отправить заявку на повторную проверку',
    response: { status: 200, type: FormPaymentDto },
  })
  async formAcceptCorrections(@Req() req: Request, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.updateFormByUser(dto, {
      status: FormPaymentStatus.FORM_WAITING_VERIFICATION,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order')
  @UserMethod({
    summary: 'добавить подписанное поручение, отправляется на проверку менеджеру',
    response: { status: 200, type: FormPaymentDto },
  })
  async order(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateOrderDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.orderByUser(dto, {
      status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
      ...updateDto,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/order-advance')
  @UserMethod({
    summary: 'добавить дополнительное подписанное поручение, отправляется на проверку менеджеру',
    response: { status: 200, type: FormPaymentDto },
  })
  async advanceOrder(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateOrderDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.advanceOrderByUser(dto, {
      status: FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
      ...updateDto,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // Отчет агента

  @Put(':_id/report')
  @UserMethod({
    summary: 'добавить подписанный отчет, отправляется на проверку менеджеру',
    response: { status: 200, type: FormPaymentDto },
  })
  async updateReport(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateReportDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.reportByUser(dto, {
      status: FormPaymentStatus.REPORT_WAITING_VERIFICATION,
      ...updateDto,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  // VF-2: Отправка поручения на подписание через Diadoc
  @Post(':_id/payment-order/sign-via-diadoc')
  @ApiBadRequestMessagesResponse([
    'Diadoc integration is not enabled',
    'Payment order not generated yet',
    'Payment order already sent to Diadoc',
    'Payment order already signed manually',
    'Payment order file not found',
    'Recipient INN is required',
    'Failed to upload document to Diadoc',
    'Failed to send document for signing to Diadoc',
  ])
  @UserMethod({
    summary: 'Отправить поручение на подписание через Diadoc',
    response: { status: 200, type: FormPaymentDto },
  })
  async signPaymentOrderViaDiadoc(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() body: FormPaymentSignViaDiadocDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.signPaymentOrderViaDiadoc(dto, body.recipientInn || '');
    return plainModelToClass(FormPaymentDto, model);
  }

  // VF-2: Получение статуса поручения в Diadoc
  @Get(':_id/payment-order/diadoc-status')
  @ApiBadRequestMessagesResponse(['Diadoc service is not available'])
  @UserMethod({
    summary: 'Получить статус поручения в Diadoc',
    response: { status: 200, type: DiadocStatusResponseDto },
  })
  async getPaymentOrderDiadocStatus(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
  ): Promise<DiadocStatusResponseDto> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    if (!this.diadocService) {
      throw new NotFoundException('Diadoc service is not available');
    }

    const formPayment = await this.service.findOneOrException({ _id: dto._id });
    const documentId = (formPayment.docs as any)?.paymentOrderDiadocDocumentId;

    if (!documentId) {
      return { status: DiadocDocumentStatus.DRAFT };
    }

    const status = await this.diadocService.getDocumentStatus(documentId);
    return {
      status,
      documentId,
      messageId: (formPayment.docs as any)?.paymentOrderDiadocMessageId,
    };
  }

  // Документы об отгрузке

  @Put(':_id/shipment')
  @UserMethod({
    summary:
      'добавляются документы об отгрузке, статус не меняется - сделан для загрузки доков на 1м шаге (если экспорт)',
    response: { status: 200, type: FormPaymentDto },
  })
  async updateShipment(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateClosingDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.shipmentByUser(dto, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/shipment/accept')
  @UserMethod({
    summary: 'добавляются документы об отгрузке, статус меняется, отправляется на проверку менеджеру',
    response: { status: 200, type: FormPaymentDto },
  })
  async updateShipmentAccept(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateClosingDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.shipmentByUser(dto, {
      status: FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
      ...updateDto,
    });
    return plainModelToClass(FormPaymentDto, model);
  }

  @Put(':_id/additional')
  @UserMethod({
    summary: 'Обновляет дополнительные документы',
    response: { status: 200, type: FormPaymentDto },
  })
  async updateAdditional(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: FormPaymentUserUpdateAdditionalDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.updateAdditionalByUser(dto, updateDto);
    return plainModelToClass(FormPaymentDto, model);
  }

  @Post(':_id/copy')
  @ApiBadRequestMessagesResponse(['Form payment not found', 'Invalid amount'])
  @UserMethod({
    summary: 'Создать копию заявки с новой суммой',
    response: { status: 201, type: FormPaymentCopyResponseDto },
  })
  async copyForm(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() copyDto: FormPaymentCopyDto,
  ): Promise<FormPaymentCopyResponseDto> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const model = await this.service.copyForm(dto._id, req.account._id, copyDto.amount);
    return plainModelToClass(FormPaymentCopyResponseDto, model);
  }

  @Post('import')
  @UserMethod({
    summary: 'Импортировать данные из Excel',
    response: { status: 201 },
  })
  async importFromExcel(@Req() req: Request, @Body() dto: FormPaymentImportDto): Promise<{ jobId: string }> {
    return this.excelService.importFromExcel(dto.formPaymentId, dto.fileId, dto.templateId, req.account._id);
  }

  @Delete(':formPaymentId/files/:fileId')
  @UserMethod({
    summary: 'Удалить файл из заявки и остановить парсинг',
    response: { status: 200 },
  })
  async deleteFileAndStopJob(
    @Req() req: Request,
    @Param('formPaymentId') formPaymentId: string,
    @Param('fileId') fileId: string,
  ): Promise<{ jobStopped: boolean }> {
    return this.excelService.deleteFileAndStopJob(formPaymentId, fileId, req.account._id);
  }

  // HS Codes endpoints

  @Patch(':_id/invoice/:uuid/hs-codes')
  @UserMethod({ response: { status: 200, type: FormPaymentDto } })
  async updateInvoiceHsCodes(
    @Req() req: Request,
    @Param('_id') formId: string,
    @Param('uuid') invoiceUuid: string,
    @Body() dto: UpdateInvoiceHsCodesDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(formId, req.account._id);

    const form = await this.service.updateInvoiceHsCodes(formId, req.account._id, invoiceUuid, dto.codes);
    return plainModelToClass(FormPaymentDto, form);
  }

  // Invoices management (without hsCodes)
  @Post(':_id/invoices')
  @UserMethod({ response: { status: 201, type: FormPaymentDto } })
  async addInvoice(@Req() req: Request, @Param() dto: IdFieldDto, @Body() body: AddInvoiceDto): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const form = await this.service.addInvoiceByUser(dto, body);
    return plainModelToClass(FormPaymentDto, form);
  }

  @Patch(':_id/invoices/:uuid')
  @UserMethod({ response: { status: 200, type: FormPaymentDto } })
  async updateInvoice(
    @Req() req: Request,
    @Param('_id') formId: string,
    @Param('uuid') invoiceUuid: string,
    @Body() body: UpdateInvoiceDto,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(formId, req.account._id);

    const form = await this.service.updateInvoiceByUser({ _id: formId }, invoiceUuid, body);
    return plainModelToClass(FormPaymentDto, form);
  }

  @Delete(':_id/invoices/:uuid')
  @UserMethod({ response: { status: 200, type: FormPaymentDto } })
  async removeInvoice(
    @Req() req: Request,
    @Param('_id') formId: string,
    @Param('uuid') invoiceUuid: string,
  ): Promise<IFormPayment> {
    await this.service.checkFormPaymentAccess(formId, req.account._id);

    const form = await this.service.removeInvoiceByUser({ _id: formId }, invoiceUuid);
    return plainModelToClass(FormPaymentDto, form);
  }

  @Get(':_id/hs-codes')
  @UserMethod({ response: { status: 200 } })
  async getAggregatedHsCodes(@Req() req: Request, @Param('_id') formId: string) {
    await this.service.checkFormPaymentAccess(formId, req.account._id);
    return this.service.getAggregatedHsCodes(formId, req.account._id);
  }

  @Get(':_id/suggested-providers')
  @UserMethod({ response: { status: 200 } })
  async getSuggestedProviders(@Req() req: Request, @Param('_id') formId: string) {
    await this.service.checkFormPaymentAccess(formId, req.account._id);
    return this.service.getSuggestedProviders(formId, req.account?.roles?.[0] || AccountRole.USER, req.account._id);
  }

  // VF-2: Установка способа подписи документов
  @Patch(':_id/sign-method')
  @ApiBadRequestMessagesResponse([
    'Form payment not found',
    'Cannot change payment order sign method after document is sent to Diadoc',
    'Cannot change report sign method after document is sent to Diadoc',
  ])
  @UserMethod({
    summary: 'Установить способ подписи документов (вручную / через ЭДО)',
    response: { status: 200, type: FormPaymentSignMethodResponseDto },
  })
  async setSignMethod(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() body: FormPaymentSignMethodDto,
  ): Promise<FormPaymentSignMethodResponseDto> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const formPayment = await this.service.setSignMethod({ _id: dto._id }, body);

    // Формируем ответ с информацией о текущих способах подписи
    return {
      paymentOrderSignMethod: (formPayment.docs as any)?.paymentOrderSignMethod || null,
      reportSignMethod: (formPayment.docs as any)?.reportSignMethod || null,
      canChangePaymentOrderSignMethod: !(formPayment.docs as any)?.paymentOrderDiadocDocumentId,
      canChangeReportSignMethod: !(formPayment.docs as any)?.reportDiadocDocumentId,
    };
  }

  // VF-2: Получение текущего способа подписи
  @Get(':_id/sign-method')
  @UserMethod({
    summary: 'Получить текущий способ подписи документов',
    response: { status: 200, type: FormPaymentSignMethodResponseDto },
  })
  async getSignMethod(@Req() req: Request, @Param() dto: IdFieldDto): Promise<FormPaymentSignMethodResponseDto> {
    await this.service.checkFormPaymentAccess(dto._id, req.account._id);

    const formPayment = await this.service.findOneOrException({ _id: dto._id }, {
      include: ['docs'],
    });

    return {
      paymentOrderSignMethod: (formPayment.docs as any)?.paymentOrderSignMethod || null,
      reportSignMethod: (formPayment.docs as any)?.reportSignMethod || null,
      canChangePaymentOrderSignMethod: !(formPayment.docs as any)?.paymentOrderDiadocDocumentId,
      canChangeReportSignMethod: !(formPayment.docs as any)?.reportDiadocDocumentId,
    };
  }

  private checkPaymentMethod(formPayment: IFormPayment): void {
    if (formPayment.paymentMethod !== FormPaymentPaymentMethod.PAY_FROM_EXPORT) {
      throw new BadRequestException('This action is available only for forms with paymentMethod = PAY_FROM_EXPORT');
    }
  }

  @Put(':_id/signing-order-verification-treasurer')
  @UserMethod({
    summary: 'перевести заявку в статус "Казначей проверяет поручение"',
    response: { status: 200, type: FormPaymentDto },
  })
  async setSigningOrderVerificationTreasurer(@Req() req: Request, @Param() dto: IdFieldDto): Promise<IFormPayment> {
    await this.checkFormPaymentAccess(dto._id, req.account._id);

    const formPayment = await this.service.findOneOrException(dto, {
      include: formPaymentPopulate.toInclude(),
    });

    this.checkPaymentMethod(formPayment);

    const allowedStatuses = [
      FormPaymentStatus.SIGNING_ORDER_TREASURER,
      FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
    ];

    if (!allowedStatuses.includes(formPayment.status)) {
      throw new BadRequestException(
        `Can not transit status from ${formPayment.status} to ${
          FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER
        }. Expected statuses: ${allowedStatuses.join(', ')}`,
      );
    }

    const model = await this.service.updateFormByUser(dto, {
      prevStatus: formPayment.status,
      status: FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
    });

    return plainModelToClass(FormPaymentDto, model);
  }
}
