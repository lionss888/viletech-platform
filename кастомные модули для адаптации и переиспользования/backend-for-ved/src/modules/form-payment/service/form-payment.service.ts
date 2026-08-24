import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cursor, FilterQuery, Model, PaginateModel, QueryOptions, UpdateQuery, Types } from 'mongoose';
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Collection, Sort } from 'mongodb';
import {
  checkTransitStatus,
  IFormPaymentCreate,
  IFormPaymentCreateCopy,
  IFormPaymentForLiquidityGlassQuery,
  IFormPaymentForXlsx,
  IFormPaymentQuery,
  IFormPaymentService,
  IFormSyncOrganizationSubaccountsRpc,
  IFormUpdate,
  IApplyPaymentPayload,
  IFormUpdateReportByAdmin,
  IFormUpdateClientOrganizationByAdmin,
} from './form-payment.service.interface';
import {
  IFormPayment,
  IFormPaymentByOrderAccepted,
  IFormBankDetails,
  IFormPaymentInvoice,
  IFormPaymentOrganization,
  IFormPaymentCurrency,
  IFormPaymentTotals,
} from 'lib/interfaces/models/form-payment.interface';
import { BaseService } from 'lib/services/base/base.service';
import { FormPayment } from './form-payment.schema';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import {
  CounterpartyEnrichmentContext,
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentKind,
  FormPaymentPattern,
  FormPaymentStage,
  FormPaymentStatus,
  FormPaymentPaymentMethod,
  PlatformPostpayMode,
} from 'lib/enums/models/form-payment.enums';
import { getIdFromAccount, isInvoiceRecognized, plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { convertMoscowTimeToUTC } from 'lib/utils/helpers/date.helpers';
import {
  eventsHash,
  formPaymentCancellationStatuses,
  formPaymentPopulate,
  mapEventFormPayment,
  transitionsExportForm,
  transitionsImportForm,
  transitionsImportFormRateOnProviderPostpay,
} from '../form-payment.constants';
import { FilePattern } from '../../../lib/enums/models/file.enums';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { FormPaymentWithAccountDocsDto, FormPaymentWithAccountDto } from '../../../lib/dto/models/form-payment.dto';
import { ContractPattern, ContractStatus } from '../../../lib/enums/models/contract.enums';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { SenderFormPaymentEvents, SenderPattern, SenderTelegramPattern } from '../../../lib/enums/models/sender.enums';
import { IDiadocService } from '../../diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../diadoc/diadoc.constants';
import { IFileService } from '../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../file/file.constants';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { AccountPattern, AccountRole } from '../../../lib/enums/models/account.enums';
import { IOcrService, OCR_SERVICE } from '../../../lib/services/ocr/ocr.service.interface';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import {
  CurrencyPattern,
  CurrencySource,
  RateStrategy,
  RateValueSource,
} from '../../../lib/enums/models/currency.enums';
import { LiquidityJobQueuePatterns, LiquidityPattern } from '../../../lib/enums/models/liquidity.enums';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import {
  OrganizationPattern,
  OrganizationStatus,
  OrganizationBusinessFormType,
  OrganizationSubaccountStatusType,
} from 'lib/enums/models/organization.enums';
import { IKonturService, KONTUR_SERVICE } from '../../../lib/services/kontur/kontur.service.interface';
import { RecognitionEventPattern } from '../../../lib/enums/models/recognition.enums';
import { IChatGptService, CHATGPT_SERVICE, JobId } from '../../../lib/services/chatgpt/chatgpt.service.interface';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from '../../../lib/enums/models/socket.enum';
import { ISocketMessage, ISocketMessageData } from '../../../lib/interfaces/models/socket.interface';
import { IFormPaymentQueueData } from '../queue/form-payment-queue.processor.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { ITelegramSend } from '../../telegram/service/telegram.service.interface';
import { IGenerateDocsService, IGenerateOrder } from './additional/generate-docs.service.interface';
import { IIdField } from '../../../lib/interfaces/id-field.interface';
import { AgentPattern } from 'lib/enums/models/agent.enums';
import {
  exportStagesHash,
  importAdvanceStagesHash,
  importPostpayStagesHash,
  StageHash,
} from 'lib/constants/models/form-payment.constants';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { IHsCodeService } from '../../hs-code/service/hs-code.service.interface';
import { IHsCode } from 'lib/interfaces/models/hs-code.interface';
import { IHsCodeSnapshot } from 'lib/interfaces/models/hs-code.interface';
import { IOrganizationService } from '../../organization/service/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../../organization/organization.constants';
import { OrganizationType } from 'lib/enums/models/organization.enums';
import { AutoProcessingService } from './auto-processing.service';
import { HsCodeIntegrationService } from './hs-code-integration.service';
import { FeatureContext } from 'lib/classes/feature-context.class';
import { FormPaymentStatusService } from './history/form-payment-status.service';
import { OrganizationStatusesHistoryService } from '../../organization/service/history/organization-statuses-history.service';
import { Organization } from '../../organization/service/organization.schema';
import { ICommissionCalculationService, COMMISSION_CALCULATION_SERVICE } from '../../../modules/commission-calculation';
import { ICommissionResult } from '../../../modules/commission-calculation/interfaces/commission-result.interface';
import { IAccountService } from '../../account/service/account.service.interface';
import { ICurrencyService } from '../../currency/service/currency.service.interface';
import { ICounterparty } from 'lib/interfaces/models/counterparty.interface';
import { PaymentChargeType, PaymentStatus } from 'lib/enums/models/payment.enums';
import { VirtualAccountUpdateService } from './additional/virtual-account-update.service';
import { CounterpartyFormPaymentHookService } from '../../counterparty/service/counterparty-form-payment-hook.service';
import { CounterpartyService } from '../../counterparty/service/counterparty.service';
import { Payment } from '../../payment/service/payment.schema';
import { IRateService, RATE_SERVICE } from '../../rate';
import { TREASURER_TASK_SERVICE } from '../../treasurer-task/treasurer-task.constants';
import { ITreasurerTaskService } from '../../treasurer-task/service/treasurer-task.service.interface';
import { ITreasurerTask } from '../../../lib/interfaces/models/treasurer-task.interface';
import { TreasurerTaskType, TreasurerTaskStatus } from '../../../lib/enums/models/treasurer-task.enums';

interface IProviderOrganization {
  _id: string;
  name: string;
  inn?: string;
  hsCodes?: string[];
  hsCodePrefixes?: string[];
}

// Константа для периода апрува организации (6 месяцев)
const ORGANIZATION_APPROVAL_EXPIRY_MONTHS = 6;

const ALLOWED_PREV_STATUSES = new Set([
  FormPaymentStatus.PAYMENT_PROCESSING,
  FormPaymentStatus.PAYMENT_SENT,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
  FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER,
]);

// Rate-on-provider postpay (postpay_rate_on_pp): from which statuses we can auto-transition to PAYMENT_RECEIVED
// после поступления полного покрытия из 1С.
const RATE_ON_PROVIDER_AUTO_PAYMENT_RECEIVED_STATUSES = new Set<FormPaymentStatus>([
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
]);

type TreasurerStatusHandler = (params: { formPayment: IFormPayment; updateData: IFormUpdate }) => void | Promise<void>;

// Where manager is allowed to fix rate and derived totals for rate-on-provider postpay.
const RATE_ON_PROVIDER_FIXATION_ALLOWED_STATUSES = new Set<FormPaymentStatus>([
  FormPaymentStatus.PAYMENT_SENT,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
]);

// Before provider payment stage pricing must not be present.
// Use stages instead of enumerating all early statuses.
const RATE_ON_PROVIDER_PRE_FIX_STAGES = new Set<FormPaymentStage>([
  FormPaymentStage.NEW,
  FormPaymentStage.ORGANIZATION_VERIFICATION,
  FormPaymentStage.FORM_VERIFICATION,
  FormPaymentStage.AGENCY_CONTRACT,
  FormPaymentStage.SIGNING_ORDER,
]);

// Граф допустимых переходов статусов именно для действий казначея.
// Идея: казначей может только довести постоплатные заявки до PAYMENT_RECEIVED
// из ограниченного набора "ожидающих" статусов.
const TREASURER_STATUS_GRAPH: Partial<Record<FormPaymentStatus, FormPaymentStatus[]>> = {
  [FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED]: [FormPaymentStatus.PAYMENT_RECEIVED],
  [FormPaymentStatus.PAYMENT_PROCESSING]: [FormPaymentStatus.PAYMENT_RECEIVED],
  [FormPaymentStatus.PAYMENT_SENT]: [FormPaymentStatus.PAYMENT_RECEIVED],
  [FormPaymentStatus.REPORT_WAITING]: [FormPaymentStatus.PAYMENT_RECEIVED],
  [FormPaymentStatus.PAYMENT_RECEIVED]: [],
  // Переходы для статусов treasurer workflow
  [FormPaymentStatus.PAYMENT_SENT_TREASURER]: [FormPaymentStatus.SIGNING_ORDER_TREASURER],
  [FormPaymentStatus.SIGNING_ORDER_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
    FormPaymentStatus.PAYMENT_SENT_TREASURER,
  ],
  [FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER]: [
    FormPaymentStatus.PAYMENT_SENT,
    FormPaymentStatus.COMPLETED,
    FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER,
  ],
  [FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER]: [
    FormPaymentStatus.SIGNING_ORDER_TREASURER,
    FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER,
  ],
};

const TREASURER_STATUS_HANDLERS: Partial<Record<FormPaymentStatus, TreasurerStatusHandler>> = {
  [FormPaymentStatus.PAYMENT_RECEIVED]: ({ formPayment, updateData }) => {
    // Централизованно проставляем prevStatus для ручного подтверждения казначеем,
    // если его не заполнил вызывающий код.
    if (!updateData.prevStatus) {
      updateData.prevStatus = formPayment.status;
    }
  },
};

const RATE_ON_PROVIDER_ADVANCE_STATUSES = new Set<FormPaymentStatus>([
  FormPaymentStatus.ADVANCE_SIGNING_ORDER,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_VERIFICATION,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
  FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
]);

@Injectable()
export class FormPaymentService
  extends BaseService<IFormPayment, FormPayment, IFormPaymentQuery, IBaseOptions, IFormPaymentCreate, IFormUpdate>
  implements IFormPaymentService
{
  private readonly logger: Logger = new Logger(FormPaymentService.name);
  private readonly legacyFormPaymentsCollection: Collection | null;

  constructor(
    @InjectModel(FormPayment.name) readonly model: PaginateModel<FormPayment>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
    @InjectModel(Payment.name) private readonly paymentModel: PaginateModel<Payment>,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject(OCR_SERVICE) protected readonly ocrService: IOcrService,
    @InjectQueue(JobQueueName.LIQUIDITY_JOB_QUEUE) private readonly liquidityQueue: Queue,
    @InjectQueue(JobQueueName.FORM_PAYMENT_QUEUE) private readonly formPaymentQueue: Queue<IFormPaymentQueueData>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => 'IFormPaymentGenerateDocsService'))
    private readonly generateDocsService: IGenerateDocsService,
    @Inject(KONTUR_SERVICE) private readonly konturService: IKonturService,
    @Inject('IHsCodeService') private readonly hsCodeService: IHsCodeService,
    @Inject(forwardRef(() => ORGANIZATION_SERVICE)) private readonly organizationService: IOrganizationService,
    private readonly autoProcessingService: AutoProcessingService,
    private readonly hsCodeIntegrationService: HsCodeIntegrationService,
    private readonly formPaymentStatusService: FormPaymentStatusService,
    private readonly organizationStatusesHistoryService: OrganizationStatusesHistoryService,
    private readonly virtualAccountUpdateService: VirtualAccountUpdateService,
    @Inject(CHATGPT_SERVICE) private readonly chatGptService: IChatGptService,
    @Inject(COMMISSION_CALCULATION_SERVICE) private readonly commissionService: ICommissionCalculationService,
    @Inject('IAccountService') private readonly accountService: IAccountService,
    @Inject('ICurrencyService') private readonly currencyService: ICurrencyService,
    @Inject(RATE_SERVICE) private readonly rateService: IRateService,
    @Inject(TREASURER_TASK_SERVICE) private readonly treasurerTaskService: ITreasurerTaskService,
    @Optional() private readonly counterpartyHook?: CounterpartyFormPaymentHookService,
    @Optional() private readonly counterpartyService?: CounterpartyService,
    @Inject(forwardRef(() => FILE_SERVICE)) @Optional() private readonly fileService?: IFileService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
  ) {
    super();
    this.legacyFormPaymentsCollection = this.model?.db?.collection('formpayments') ?? null;
  }

  // методы для клиента

  async findOneOrException(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment | undefined> {
    // Получаем модель напрямую, чтобы проверить paymentMethod перед populate
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);
    const model = (await this.model.findOne(query, options?.select, options).populate(populate).exec()) as FormPayment;

    if (!model) {
      throw new NotFoundException(`${this.model.modelName} not found.`);
    }

    const formPayment = await this.toPlain(model, options);

    this.stripAccountRateHistory(formPayment);
    this.hydrateContractFromInvoices(formPayment);
    await this.addContractFile(formPayment);
    await this.addContractsDataToFormPayment(formPayment, options);
    await this.enrichCounterpartyFromRegistryMany([formPayment]);
    await this.enrichLinkedExportForms([formPayment]);
    await this.enrichTask([formPayment]);
    await this.enrichTreasurerOrderFiles([formPayment]);

    return formPayment;
  }

  /**
   * Находит форму платежа или выбрасывает исключение, обогащая данные контрагента включая неактивных.
   * Используется в API менеджера для получения полных данных контрагента.
   */
  async findOneOrExceptionForManager(
    findData: IFormPaymentQuery,
    options?: IBaseOptions,
  ): Promise<IFormPayment | undefined> {
    const formPayment = await super.findOneOrException(findData, options);

    this.hydrateContractFromInvoices(formPayment);
    await this.addContractFile(formPayment);
    await this.addContractsDataToFormPayment(formPayment, options);
    await this.enrichCounterpartyFromRegistryForManager(formPayment);
    await this.enrichTask([formPayment]);
    await this.enrichTreasurerOrderFiles([formPayment]);

    return formPayment;
  }

  /**
   * Находит форму платежа или выбрасывает исключение, обогащая данные контрагента включая неактивных.
   * Используется при генерации поручений для получения полных данных контрагента.
   */
  async findOneOrExceptionForOrder(
    findData: IFormPaymentQuery,
    options?: IBaseOptions,
  ): Promise<IFormPayment | undefined> {
    const formPayment = await super.findOneOrException(findData, options);

    this.hydrateContractFromInvoices(formPayment);
    await this.addContractFile(formPayment);
    await this.addContractsDataToFormPayment(formPayment, options);
    await this.enrichCounterpartyFromRegistryForOrder(formPayment);
    await this.enrichTask([formPayment]);
    await this.enrichTreasurerOrderFiles([formPayment]);

    return formPayment;
  }

  /**
   * Находит форму платежа или выбрасывает исключение, обогащая данные контрагента включая неактивных.
   * Используется в site API для получения полных данных контрагента.
   */
  async findOneOrExceptionForSite(
    findData: IFormPaymentQuery,
    options?: IBaseOptions,
  ): Promise<IFormPayment | undefined> {
    const formPayment = await super.findOneOrException(findData, options);

    this.hydrateContractFromInvoices(formPayment);
    await this.addContractFile(formPayment);
    await this.addContractsDataToFormPayment(formPayment, options);
    await this.enrichCounterpartyFromRegistryForSite(formPayment);
    await this.enrichTask([formPayment]);
    await this.enrichTreasurerOrderFiles([formPayment]);

    return formPayment;
  }

  async findOne(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment | undefined> {
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);
    const model = (await this.model.findOne(query, options?.select, options).populate(populate).exec()) as FormPayment;

    if (model) {
      const formPayment = await this.toPlain(model, options);
      this.stripAccountRateHistory(formPayment);
      this.hydrateContractFromInvoices(formPayment);
      await this.addContractFile(formPayment);
      await this.enrichCounterpartyFromRegistryMany([formPayment]);
      await this.enrichLinkedExportForms([formPayment]);
      await this.enrichTask([formPayment]);
      await this.enrichTreasurerOrderFiles([formPayment]);
      return formPayment;
    }

    const legacyFormPayment = await this.findLegacyFormPayment(findData, options);
    if (!legacyFormPayment) {
      return;
    }

    await this.enrichCounterpartyFromRegistryMany([legacyFormPayment]);

    return legacyFormPayment;
  }

  async find(
    findData: IFormPaymentQuery,
    options?: IPaginateOptions & IBaseOptions,
  ): Promise<IPaginateResult<IFormPayment>> {
    const result = await super.find(findData, options);

    if (result.docs?.length) {
      this.stripRateHistoryFromForms(result.docs);
      this.hydrateContractsFromInvoices(result.docs);
      await this.addContractFileToForms(result.docs);
      await this.enrichCounterpartyFromRegistryMany(result.docs);
      await this.enrichLinkedExportForms(result.docs);
      await this.enrichTask(result.docs);
      await this.enrichTreasurerOrderFiles(result.docs);
      return result;
    }

    const legacyResult = await this.findLegacyFormPaymentsPaginated(findData, options);
    if (!legacyResult) {
      return result;
    }

    this.hydrateContractsFromInvoices(legacyResult.docs);
    await this.addContractFileToForms(legacyResult.docs);
    await this.enrichCounterpartyFromRegistryMany(legacyResult.docs);
    await this.enrichLinkedExportForms(legacyResult.docs);
    await this.enrichTask(legacyResult.docs);
    await this.enrichTreasurerOrderFiles(legacyResult.docs);

    return legacyResult;
  }

  async findMany(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment[]> {
    const forms = await super.findMany(findData, options);

    if (forms.length) {
      this.stripRateHistoryFromForms(forms);
      this.hydrateContractsFromInvoices(forms);
      await this.addContractFileToForms(forms);
      await this.enrichCounterpartyFromRegistryMany(forms);
      await this.enrichLinkedExportForms(forms);
      await this.enrichTask(forms);
      await this.enrichTreasurerOrderFiles(forms);
      return forms;
    }

    const legacyForms = await this.findLegacyFormPayments(findData, options);
    if (!legacyForms.length) {
      return [];
    }

    this.hydrateContractsFromInvoices(legacyForms);
    await this.addContractFileToForms(legacyForms);
    await this.enrichCounterpartyFromRegistryMany(legacyForms);
    await this.enrichLinkedExportForms(legacyForms);
    await this.enrichTask(legacyForms);
    await this.enrichTreasurerOrderFiles(legacyForms);

    return legacyForms;
  }

  private async findLegacyFormPayment(findData: IFormPaymentQuery, options?: IBaseOptions) {
    if (!this.legacyFormPaymentsCollection) {
      return;
    }

    const normalizedFindData = this.normalizeLegacyQuery(findData);
    const query = await this.makeQuery(normalizedFindData);
    const doc = await this.legacyFormPaymentsCollection.findOne(query);
    if (!doc) {
      return;
    }

    const [mapped] = await this.mapLegacyDocuments([doc], options);
    this.hydrateContractFromInvoices(mapped);
    await this.addContractFile(mapped);
    return mapped;
  }

  private async findLegacyFormPayments(findData: IFormPaymentQuery, options?: IBaseOptions) {
    if (!this.legacyFormPaymentsCollection) {
      return [];
    }

    const normalizedFindData = this.normalizeLegacyQuery(findData);
    const query = await this.makeQuery(normalizedFindData);
    const docs = await this.legacyFormPaymentsCollection.find(query).toArray();

    if (!docs.length) {
      return [];
    }

    return this.mapLegacyDocuments(docs, options);
  }

  private async findLegacyFormPaymentsPaginated(
    findData: IFormPaymentQuery,
    options?: IPaginateOptions & IBaseOptions,
  ): Promise<IPaginateResult<IFormPayment> | null> {
    if (!this.legacyFormPaymentsCollection) {
      return null;
    }

    const normalizedFindData = this.normalizeLegacyQuery(findData);
    const query = await this.makeQuery(normalizedFindData);
    const limit = options?.limit ?? 0;
    const page = Math.max(1, options?.page ?? 1);
    const skip = limit ? (page - 1) * limit : 0;
    const cursor = this.legacyFormPaymentsCollection.find(query);

    const sortOption = (options?.sort as Sort | Record<string, 1 | -1> | undefined) ?? { createDate: -1 };
    cursor.sort(sortOption);

    if (skip) {
      cursor.skip(skip);
    }

    if (limit) {
      cursor.limit(limit);
    }

    const docs = await cursor.toArray();
    if (!docs.length) {
      return null;
    }

    const totalDocs = await this.legacyFormPaymentsCollection.countDocuments(query);
    const mappedDocs = await this.mapLegacyDocuments(docs, options);
    const hasNext = limit ? skip + mappedDocs.length < totalDocs : false;

    return {
      docs: mappedDocs,
      hasNext,
      limit: limit || mappedDocs.length,
      page,
      offset: options?.offset,
    };
  }

  private async mapLegacyDocuments(docs: Array<Record<string, unknown>>, options?: IBaseOptions) {
    if (!docs.length) {
      return [];
    }

    const hydratedDocs = docs.map((doc) => this.model.hydrate(doc));

    const mappedDocs: IFormPayment[] = await this.mapMany(hydratedDocs, options);

    return mappedDocs;
  }

  private normalizeLegacyQuery(findData: IFormPaymentQuery): IFormPaymentQuery {
    const normalized: IFormPaymentQuery = { ...findData };

    if (typeof normalized.account === 'string' && Types.ObjectId.isValid(normalized.account)) {
      normalized.account = new Types.ObjectId(normalized.account);
    }

    if (
      normalized.organizationSubaccount &&
      typeof normalized.organizationSubaccount === 'string' &&
      Types.ObjectId.isValid(normalized.organizationSubaccount)
    ) {
      normalized.organizationSubaccount = new Types.ObjectId(normalized.organizationSubaccount);
    }

    return normalized;
  }

  /**
   * Валидация экспортных сделок для привязки к импортной сделке
   * Проверяет, что все сделки существуют, являются экспортными, имеют статус PAYMENT_RECEIVED
   * и принадлежат тому же пользователю
   */
  private async validateLinkedExportForms(
    exportFormIds: string[] = [],
    currentDirection?: FormPaymentDirection,
    accountId?: string | Types.ObjectId | IAccount,
  ): Promise<string[]> {
    const normalizedIds = _.chain(exportFormIds || [])
      .map((id) => id?.toString?.() ?? String(id))
      .filter(Boolean)
      .uniq()
      .value();

    if (!normalizedIds.length) {
      return [];
    }

    if (currentDirection !== FormPaymentDirection.IMPORT) {
      throw new BadRequestException('Сначала укажите направление import, затем добавляйте связанные экспортные сделки');
    }

    if (!accountId) {
      throw new BadRequestException('Не указан аккаунт для валидации экспортных сделок');
    }

    const accountIdString = getIdFromAccount(accountId)?.toString();

    // Получаем экспортные сделки для проверки
    const exportForms = await this.model.find({
      _id: { $in: normalizedIds.map((id) => new Types.ObjectId(id)) },
    });

    if (exportForms.length !== normalizedIds.length) {
      const foundIds = exportForms.map((f) => f._id.toString());
      const notFoundIds = normalizedIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Экспортные сделки не найдены: ${notFoundIds.join(', ')}`);
    }

    // Проверяем каждую сделку
    for (const exportForm of exportForms) {
      // Проверка направления
      if (exportForm.direction !== FormPaymentDirection.EXPORT) {
        throw new BadRequestException(`Сделка ${exportForm.uid || exportForm._id} не является экспортной`);
      }

      // Проверка статуса
      if (exportForm.status !== FormPaymentStatus.PAYMENT_RECEIVED) {
        const formId = exportForm.uid || exportForm._id;
        throw new BadRequestException(
          `Экспортная сделка ${formId} должна иметь статус PAYMENT_RECEIVED, текущий статус: ${exportForm.status}`,
        );
      }

      // Проверка принадлежности пользователю
      const exportFormAccountId = getIdFromAccount(exportForm.account)?.toString();
      if (exportFormAccountId !== accountIdString) {
        throw new BadRequestException(
          `Экспортная сделка ${exportForm.uid || exportForm._id} не принадлежит текущему пользователю`,
        );
      }

      // Проверка, что сделка не заморожена
      if (exportForm.isFreeze) {
        throw new BadRequestException(
          `Экспортная сделка ${exportForm.uid || exportForm._id} уже привязана к другой импортной сделке`,
        );
      }

      // Проверка доступности
      if (exportForm.isAvailable === false) {
        throw new BadRequestException(`Экспортная сделка ${exportForm.uid || exportForm._id} недоступна для привязки`);
      }
    }

    return normalizedIds;
  }

  async findForLiquidityGlass(
    findData: IFormPaymentForLiquidityGlassQuery,
    paginateOptions: IPaginateOptions,
  ): Promise<IPaginateResult<IFormPaymentByOrderAccepted>> {
    const statusesFilter =
      findData.direction === FormPaymentDirection.IMPORT
        ? [
            FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
            FormPaymentStatus.PAYMENT_RECEIVED,
            FormPaymentStatus.PAYMENT_PROCESSING,
            FormPaymentStatus.PAYMENT_SENT,
          ]
        : [
            FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
            FormPaymentStatus.PAYMENT_RECEIVED,
            FormPaymentStatus.PAYMENT_PROCESSING,
            FormPaymentStatus.PAYMENT_SENT,
          ];

    const result = await super.find(
      {
        direction: findData.direction,
        orderAcceptanceDateExists: true,
        isOrderAccepted: true,
        statuses: statusesFilter,
        coverAmountExists: true,
        amountExists: true,
      },
      { ...paginateOptions },
    );

    const isImport = findData.direction === FormPaymentDirection.IMPORT;

    return {
      ...result,
      docs: result.docs.map(({ _id, counterparty, totals, currency, orderAcceptanceDate }) => ({
        _id,
        country: counterparty?.bankCountry,
        amount: isImport ? totals?.coverAmount : totals?.amount,
        currency: isImport ? currency?.client : currency?.counterparty,
        sentDate: orderAcceptanceDate,
      })),
    };
  }

  async create(createData: IFormPaymentCreate): Promise<IFormPayment> {
    if (createData.invoices?.length) {
      await this.checkInvoices(createData);
      createData.invoices = _.map(createData.invoices, (invoice) => ({ ...invoice, uuid: uuidv4() }));
    }

    await this.validateFormContract(createData.contract, createData.account);

    // Валидация привязываемых экспортных сделок
    if (!_.isUndefined(createData.linkedExportForms)) {
      createData.linkedExportForms = await this.validateLinkedExportForms(
        createData.linkedExportForms,
        createData.direction,
        createData.account,
      );
    }

    const invoicesFiles = _.filter(createData.invoices, (invoice) => !!invoice.file);

    createData.status =
      this.ocrService.isAvailable && invoicesFiles.length ? FormPaymentStatus.CREATING : FormPaymentStatus.DRAFT;

    createData.prevStatus = createData.status =
      this.ocrService.isAvailable && invoicesFiles.length ? FormPaymentStatus.CREATING : FormPaymentStatus.DRAFT;

    createData.platformPaymentCondition = FormPaymentCondition.ADVANCE;

    // Устанавливаем isAvailable: true для экспортных сделок при создании
    if (createData.direction === FormPaymentDirection.EXPORT) {
      createData.isAvailable = true;
    }

    const form = await super.create(createData);

    // Устанавливаем isFreeze: true для привязанных экспортных сделок при создании
    if (createData.linkedExportForms?.length) {
      await this.model.updateMany({ _id: { $in: createData.linkedExportForms } }, { $set: { isFreeze: true } });
    }

    // Подсчитываем и сохраняем сумму привязанных экспортных сделок для импортных сделок
    if (form.direction === FormPaymentDirection.IMPORT && createData.linkedExportForms?.length) {
      await this.calculateAndSaveLinkedExportFormsTotalAmount(form, createData.linkedExportForms);
    }

    if (this.counterpartyHook && form.counterpartyRef) {
      await this.counterpartyHook.onFormPaymentCreated(form._id.toString(), form.counterpartyRef.toString());
    }

    if (invoicesFiles.length) {
      this.client.emit(RecognitionEventPattern.INVOICE_RECOGNIZE_MANY, form);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.CREATE,
      formPayment: form,
    });

    return form;
  }

  async cancelFormByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (updateData.status) {
      const isCheckTransit = this.checkTransit({
        startStatus: formPayment.status,
        endStatus: updateData.status,
        direction: formPayment.direction,
        platformPostpayMode: formPayment.platformPostpayMode,
        isCorporateClient: this.isCorporate(formPayment),
      });

      if (!isCheckTransit) {
        throw new BadRequestException(`Can not transit status from ${formPayment.status} to ${updateData.status}`);
      }

      if (updateData.status === FormPaymentStatus.CANCELED_BY_USER && formPayment.totals?.feePaid) {
        throw new BadRequestException(`Can not cancel form payment. Fee already paid`);
      }

      updateData.prevStatus = formPayment.status;

      this.handleOrderFlagsInStatusTransit(formPayment, updateData);
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    if (updateData.status) {
      // Обновляем виртуальные счета при изменении статуса
      if (formPayment.status !== updateData.status) {
        this.virtualAccountUpdateService
          .updateVirtualAccountsOnStatusChange(updatedForm, formPayment.status, updateData.status)
          .catch((err) => {
            this.logger.error(
              `Error updating virtual accounts in cancelFormByUser for form payment ${updatedForm._id}: ${err.message}`,
            );
          });
      }
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  // патч формы и подтверждение
  async updateFormByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (formPayment.sourceFormId)
      if (
        _.keys(updateData) // Если среди ключей
          .some(
            // есть хоть один
            (key) => !['status', 'amount'].includes(key), //который не является status или amount
          )
      ) {
        throw new BadRequestException('Cannot modify copied form. Only amount can be changed during copy creation.');
      }

    if (!_.isNil(updateData.platformPostpayMode)) {
      throw new ForbiddenException('Only manager or root can change payment scenario');
    }

    if (!_.isNil(updateData.platformPaymentCondition)) {
      if (
        updateData.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
        !formPayment.account.enablePostpay
      ) {
        throw new BadRequestException('Postpay is not available to you');
      }

      updateData.paymentAgencyFeeCondition = updateData.platformPaymentCondition;
    }

    const isUpdateRestricted = ![FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS].includes(
      formPayment.status,
    );

    if (isUpdateRestricted) {
      // Разрешаем переходы для treasurer workflow (когда клиент работает с поручением казначея)
      const isTreasurerOrderVerificationTransition =
        (formPayment.status === FormPaymentStatus.SIGNING_ORDER_TREASURER ||
          formPayment.status === FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER) &&
        updateData.status === FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER;

      if (isTreasurerOrderVerificationTransition) {
        // Пропускаем проверку ограничений для этого перехода
      } else {
        const isUpdatingAdditional = Boolean(updateData.addAdditional?.length || updateData.removeAdditional?.length);
        const canUpdateAdditional = [
          FormPaymentStatus.DRAFT,
          FormPaymentStatus.FORM_WAITING_CORRECTIONS,
          FormPaymentStatus.CONTRACT_WAITING,
          FormPaymentStatus.SIGNING_ORDER,
          FormPaymentStatus.ADVANCE_SIGNING_ORDER,
          FormPaymentStatus.REPORT_WAITING,
          FormPaymentStatus.SHIPMENT_WAITING,
        ].includes(formPayment.status);

        if (isUpdatingAdditional && canUpdateAdditional) {
          return this.updateAdditionalByUser(findData, updateData, options);
        }

        throw new BadRequestException('Can not modify form payment');
      }
    }

    if (!_.isUndefined(updateData.contract)) {
      await this.validateFormContract(updateData.contract as string, findData.account as string);
    }

    // обрабатываем изменение формы оплаты
    // Когда менеджер отправил заявку клиенту на уточнение, нужно запретить ему менять направление сделки
    if (
      formPayment.status === FormPaymentStatus.FORM_WAITING_CORRECTIONS &&
      updateData.direction &&
      updateData.direction !== formPayment.direction
    ) {
      throw new BadRequestException('Can not change direction when form payment in form_waiting_corrections status');
    }

    // Клиент вообще не должен переводить заявку в статус FORM_ACCEPTED —
    // этот статус устанавливают только сотрудники (менеджер/compliance_officer)
    if (updateData.status === FormPaymentStatus.FORM_ACCEPTED) {
      throw new ForbiddenException('Only staff can set status FORM_ACCEPTED');
    }

    if (updateData.status) {
      this.handleOrderFlagsInStatusTransit(formPayment, updateData);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'provider')) {
      throw new BadRequestException('Client is not allowed to change provider');
    }

    const direction = updateData.direction || formPayment.direction;
    if (direction && !updateData.paymentAgencyFeeCondition) {
      updateData.paymentAgencyFeeCondition =
        direction === FormPaymentDirection.IMPORT ? FormPaymentCondition.ADVANCE : FormPaymentCondition.POST_PAYMENT;
    }

    // Ignore invoices updates in form patch: invoices must be managed via dedicated endpoints
    if (updateData && Object.prototype.hasOwnProperty.call(updateData, 'invoices')) {
      this.logger.warn('Ignoring invoices in updateFormByUser; use invoices endpoints instead');
      delete updateData.invoices;
    }

    // Validate preferred provider selection - must be from suggested providers list
    if (updateData.preferedProvider) {
      const userRole = formPayment.account.roles?.[0] || AccountRole.USER;
      const suggestedProviders = await this.getSuggestedProviders(formPayment._id.toString(), userRole);

      this.logger.debug(
        `[Form ${formPayment._id}] Validating prefered provider ${updateData.preferedProvider}, role: ${userRole}, suggested count: ${suggestedProviders.length}`,
      );

      const isValidPreferredProvider = suggestedProviders.some((p) => {
        const match = p._id === updateData.preferedProvider || p._id.toString() === updateData.preferedProvider;
        this.logger.debug(`  Checking ${p._id} vs ${updateData.preferedProvider}: ${match}`);
        return match;
      });

      if (!isValidPreferredProvider) {
        this.logger.warn(
          `[Form ${formPayment._id}] Preferred provider ${
            updateData.preferedProvider
          } NOT in suggested list. Suggested IDs: ${suggestedProviders.map((p) => p._id).join(', ')}`,
        );
        throw new BadRequestException('Selected preferred provider is not in the suggested providers list');
      }

      this.logger.debug(
        `[Form ${formPayment._id}] Preferred provider ${updateData.preferedProvider} validated successfully (role: ${userRole})`,
      );
    }

    // No invoice merging within form patch anymore

    if (updateData.amount) {
      updateData.amount = Math.round(updateData.amount);
    }

    // Факт изменения валют, суммы, формы оплаты или направления сделки
    const hasPaymentChanges =
      !!_.intersection(_.keys(updateData), [
        'amount',
        'currencyClient',
        'currencyCounterparty',
        'direction',
        'platformPaymentCondition',
      ]).length &&
      !_.isEqual(
        {
          ..._.pick(updateData, [
            'amount',
            'currencyClient',
            'currencyCounterparty',
            'direction',
            'platformPaymentCondition',
          ]),
        },
        {
          direction: formPayment.direction,
          amount: formPayment.totals?.amount,
          currencyClient: formPayment.currency?.client,
          currencyCounterparty: formPayment.currency?.counterparty,
          platformPaymentCondition: formPayment.platformPaymentCondition,
        },
      );

    // Перерасчет необходим если клиент первый раз отправляет заявку на проверку и курс еще не установлен,
    // или если клиент поменял важные для рассчета данные при коррекции
    const nextDirection = updateData.direction ?? formPayment.direction;
    const nextPlatformPaymentCondition = updateData.platformPaymentCondition ?? formPayment.platformPaymentCondition;
    const nextPlatformPostpayMode = updateData.platformPostpayMode ?? formPayment.platformPostpayMode;
    const isRateOnProviderPostpayImport = this.isRateOnProviderPostpayImportScenario({
      direction: nextDirection,
      platformPaymentCondition: nextPlatformPaymentCondition,
      platformPostpayMode: nextPlatformPostpayMode,
    });

    const needRecalculation =
      (_.includes(
        [FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION, FormPaymentStatus.FORM_ACCEPTED],
        updateData.status,
      ) &&
        formPayment.direction === FormPaymentDirection.IMPORT &&
        !formPayment.currency?.rate) ||
      (hasPaymentChanges && formPayment.status === FormPaymentStatus.FORM_WAITING_CORRECTIONS);

    if (needRecalculation && !isRateOnProviderPostpayImport) {
      const rawCounterpartyCurrency = updateData.currencyCounterparty || formPayment.currency?.counterparty;
      const rawClientCurrency = updateData.currencyClient || formPayment.currency?.client;
      const amount = Math.round(updateData.amount || formPayment.totals?.amount);

      const counterpartyCurrency = this.normalizeCurrencySymbol(rawCounterpartyCurrency);
      const clientCurrency = this.normalizeCurrencySymbol(rawClientCurrency);

      if (!counterpartyCurrency || !clientCurrency) {
        throw new BadRequestException('Client or counterparty currency is not supported');
      }

      const { frontendRate } = await this.rateService.resolveDealRate({
        account: formPayment.account as IAccount,
        clientCurrency,
        counterpartyCurrency,
      });

      updateData.currency = {
        ...formPayment.currency,
        base: counterpartyCurrency,
        counterparty: counterpartyCurrency,
        client: clientCurrency,
        rate: frontendRate,
      };

      updateData.totals = { ...formPayment.totals };

      let coverAmount: number | undefined;
      coverAmount = this.rateService.calcCoverAmount({
        amountMinor: amount,
        frontendRate: updateData.currency.rate,
      });
      updateData.totals.coverAmount = coverAmount;

      // Если менеджер уже указывал feePercent — оставляем.
      // Иначе: если у аккаунта есть фиксированный feePercent — используем его.
      // Иначе: если rateSettings отсутствуют — используем дефолт 2.5%.
      const existingFeePercent = formPayment.totals?.feePercent;
      const accountFeePercent = formPayment.account?.feePercent;
      const hasRateSettings = this.hasAccountRateSettings(formPayment.account);
      const DEFAULT_FEE_PERCENT_BPS = 250;

      const feePercent = _.isNumber(existingFeePercent)
        ? existingFeePercent
        : _.isNumber(accountFeePercent)
        ? accountFeePercent
        : !hasRateSettings
        ? DEFAULT_FEE_PERCENT_BPS
        : undefined;

      if (_.isNumber(feePercent) && coverAmount !== undefined) {
        updateData.totals.feePercent = feePercent;
        updateData.totals.feeAmount = Math.round((coverAmount * feePercent) / 10000);
      }

      updateData.totals.amount = amount;

      const platformPaymentCondition = updateData.platformPaymentCondition || formPayment.platformPaymentCondition;
      const platformPostpayMode = updateData.platformPostpayMode ?? formPayment.platformPostpayMode;
      // Убираем из заявки поля, которых не должно быть при постоплате
      if (platformPaymentCondition === FormPaymentCondition.POST_PAYMENT) {
        const isRateOnProviderPostpay = platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP;

        if (isRateOnProviderPostpay) {
          // For rate-on-provider postpay we keep fee terms (percent + fixed fee in its currency),
          // but clear rates and derived totals until provider-payment stage.
          updateData.clearRatesMode = 'ratesOnly';
          delete updateData.totals.feeAmount;
          delete updateData.totals.coverAmount;
          delete updateData.totals.feeFixCover;
          delete updateData.currency.rate;
          delete updateData.currency.rateSource;
          delete updateData.currency.fixFeeRate;
          delete updateData.currency.fixFeeRateSource;
        } else {
          updateData.clearRates = true;
          delete updateData.totals.feeAmount;
          delete updateData.totals.coverAmount;
          delete updateData.totals.feeFix;
          delete updateData.totals.feeFixCover;
          delete updateData.totals.feePercent;
          delete updateData.currency.rate;
          delete updateData.currency.rateSource;
          delete updateData.currency.fixFeeCurrency;
          delete updateData.currency.fixFeeRate;
          delete updateData.currency.fixFeeRateSource;
        }
      }

      delete updateData.amount;
      delete updateData.currencyClient;
      delete updateData.currencyCounterparty;

      updateData.prevStatus = FormPaymentStatus.DRAFT;
    }

    // Prevent moving to compliance verification if there are goods invoices without HS codes
    const willMoveToFormWaitingVerification =
      updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION ||
      (updateData.status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION &&
        formPayment.organization?.status === OrganizationStatus.APPROVED);

    if (willMoveToFormWaitingVerification) {
      this.validateInvoicesHaveHsCodes(formPayment.invoices);
    }

    if (
      updateData.status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION &&
      formPayment.organization?.status === OrganizationStatus.APPROVED
    ) {
      updateData.status = FormPaymentStatus.FORM_WAITING_VERIFICATION;
    }

    // Пропуск комплаенс проверок для скопированных форм с апрувленными организациями
    if (
      formPayment.sourceFormId && // Форма является скопированной
      formPayment.organization?.status === OrganizationStatus.APPROVED
    ) {
      if (updateData.status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION) {
        updateData.status = FormPaymentStatus.FORM_ACCEPTED; // По тз так, а по факту сомневаюсь, что должно так быть. А если орга проверена, а менеджером нет, и мы скопировали?
      }
    }

    await this.handleEmbeddedOrganizationUpdate(formPayment, updateData);

    if (updateData.organization && typeof updateData.organization === 'string') {
      if (updateData.organization !== formPayment.organization?._id) {
        const organization = await this.client.send<IOrganization>(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
          query: { _id: updateData.organization },
        });

        if (organization.status === OrganizationStatus.BLOCKED) {
          throw new BadRequestException('Organization is blocked');
        }

        updateData.organization = {
          ..._.omit(organization, ['requisites', 'subaccounts', 'account']),
          refOrganizationId: organization._id,
          isChanged: false,
        };
      } else {
        delete updateData.organization;
      }
    }

    if (
      formPayment.status === FormPaymentStatus.DRAFT &&
      (updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION ||
        updateData.status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION) &&
      !formPayment.sentDate
    ) {
      updateData.sentDate = new Date();
    }

    // Auto-link or create Counterparty in registry if user provided bank details but no registry link yet
    if (
      this.counterpartyService &&
      !formPaymentModel.counterpartyRef &&
      !updateData.counterpartyRef &&
      updateData.counterparty &&
      updateData.counterparty.name &&
      updateData.counterparty.bankName
    ) {
      try {
        const accountId = getIdFromAccount(formPayment.account)?.toString();
        if (accountId) {
          const cp: Partial<IFormBankDetails & { currency?: string }> = updateData.counterparty;
          const counterpartyAddress =
            cp.address || formPayment.counterparty?.address || formPayment.counterparty?.legalAddress;
          const counterpartyCountry = cp.country || formPayment.counterparty?.country;
          const counterpartyCurrency =
            updateData.currency?.counterparty ||
            updateData.currencyCounterparty ||
            cp.currency ||
            formPayment.currency?.counterparty;

          const bankDetails = {
            name: cp.name,
            country: counterpartyCountry,
            address: counterpartyAddress,
            bankCountry: cp.bankCountry || counterpartyCountry,
            bankName: cp.bankName,
            bankAddress: cp.bankAddress,
            swiftCode: cp.swiftCode,
            accountNumber: cp.accountNumber,
            currency: counterpartyCurrency,
          } as Record<string, unknown>;

          const result = await this.counterpartyService.findOrCreateFromFormBankDetails(accountId, bankDetails);

          updateData.counterpartyRef = result.counterpartyId;
          updateData.counterpartyBankUuid = result.bankUuid;
          updateData.counterpartyAccountUuid = result.accountUuid;
        }
      } catch (err) {
        this.logger.error(`Failed to auto-link counterparty: ${err?.message}`);
      }
    }

    // Track if transitioning to FORM_WAITING_VERIFICATION for HS code processing
    const isTransitioningToVerification =
      updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION &&
      formPayment.status !== FormPaymentStatus.FORM_WAITING_VERIFICATION;

    // Если статус изменен на FORM_WAITING_VERIFICATION, запускаем анализ контрагента через ChatGPT
    const isStatusChangedToWaitingVerification =
      updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION &&
      formPayment.status !== FormPaymentStatus.FORM_WAITING_VERIFICATION;

    let updatedForm = await this.updateOne({ _id: findData._id }, updateData, options);

    if (this.isPricingFixed(updatedForm)) {
      updatedForm = await this.ensureFixedCommissionConsistency(updatedForm);
    }

    // Process HS codes if form is transitioning to verification status
    if (isTransitioningToVerification && updatedForm._id) {
      const hsCodeResult = await this.checkHsCodesRiskAndProcess(updatedForm._id);

      // If HS code processing changed the status, fetch the updated form
      if (hsCodeResult.statusToSet && hsCodeResult.statusToSet !== FormPaymentStatus.FORM_WAITING_VERIFICATION) {
        updatedForm = await this.findOneOrException({ _id: updatedForm._id });
      }
    }

    if (isStatusChangedToWaitingVerification && formPayment.account) {
      const isChatGptActive = this.configService.get('recognize.chatgpt.isActive');
      if (isChatGptActive) {
        const formPaymentId = String(updatedForm._id);

        this.analyzeCounterpartyWithChatGpt(formPaymentId).catch((err) => {
          this.logger.error(
            `Error while analyzing counterparty via ChatGPT for form payment ${formPaymentId}: ${err.message}`,
            err instanceof Error ? err.stack : undefined,
          );
          // Не пробрасываем ошибку дальше, чтобы не блокировать основной процесс обновления заявки
        });
      }
    }

    if (updateData.status) {
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    if (
      _.isArray(updatedForm.invoices) &&
      !isInvoiceRecognized(updatedForm.invoices[0]) &&
      updatedForm?.invoices[0]?.file !== formPayment?.invoices[0]?.file
    ) {
      this.client.emit(RecognitionEventPattern.INVOICE_RECOGNIZE_MANY, updatedForm);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    // If we linked a counterparty for the first time, add reverse link from registry
    if (this.counterpartyHook && updateData.counterpartyRef) {
      try {
        await this.counterpartyHook.onFormPaymentCreated(
          updatedForm._id.toString(),
          updateData.counterpartyRef.toString(),
        );
      } catch (err) {
        this.logger.error(`Failed to link form to counterparty: ${err?.message}`);
      }
    }

    return updatedForm;
  }

  private async enrichFormPaymentOrganizationFromKontur(
    inn: string,
    fallback: {
      name?: string;
      fullName?: string;
      businessForm?: OrganizationBusinessFormType;
    },
  ): Promise<{
    name?: string;
    fullName?: string;
    businessForm?: OrganizationBusinessFormType;
  }> {
    if (!inn || typeof inn !== 'string') {
      this.logger.debug('Skipping Kontur enrichment: no INN provided');
      return fallback;
    }

    try {
      const konturData = await this.konturService.fetchOrganizationByInn(inn);

      if (!konturData) {
        this.logger.warn(`Kontur API returned no data for INN: ${inn}. Using user-provided fallback values.`);
        return fallback;
      }

      this.logger.log(`Successfully enriched organization data from Kontur for INN: ${inn}`);

      return {
        name: konturData.name || fallback.name,
        fullName: konturData.fullName || fallback.fullName,
        businessForm: konturData.businessForm || fallback.businessForm,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error fetching Kontur data for INN: ${inn}. Using user-provided fallback.`,
        error instanceof Error ? error.stack : String(error),
      );
      return fallback;
    }
  }

  private async handleEmbeddedOrganizationUpdate(
    formPayment: FormPaymentWithAccountDto,
    updateData: IFormUpdate,
  ): Promise<void> {
    const hasEmbeddedOrgUpdates = !!(
      updateData.organizationName ||
      updateData.organizationFullName ||
      updateData.organizationBusinessForm
    );

    const hasInnUpdate = !!updateData.organizationInn;

    if (!hasEmbeddedOrgUpdates && !hasInnUpdate) {
      return;
    }

    if (!formPayment.organization) {
      throw new BadRequestException(
        'Cannot update organization fields: no organization associated with this form payment',
      );
    }

    this.validateFormStatusForOrgUpdate(formPayment);

    const currentInn = formPayment.organization.inn;
    const newInn = updateData.organizationInn;
    const innChanged = newInn && newInn !== currentInn;

    if (innChanged) {
      await this.handleInnChange(formPayment._id, currentInn, newInn, updateData);
    } else if (hasEmbeddedOrgUpdates) {
      this.handleNameFieldsWithoutInnChange(formPayment);
    }

    if (updateData.organization && typeof updateData.organization === 'string') {
      throw new BadRequestException('Cannot update organization fields and replace organization simultaneously');
    }

    this.applyOrganizationFieldsUpdate(updateData);
  }

  private validateFormStatusForOrgUpdate(formPayment: FormPaymentWithAccountDto): void {
    const isCanceled = [
      FormPaymentStatus.CANCELED_BY_USER,
      FormPaymentStatus.CANCELED_BY_MANAGER,
      FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
      FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
    ].includes(formPayment.status);

    const isNotApproved = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS].includes(
      formPayment.status,
    );

    if (!isCanceled && !isNotApproved) {
      throw new ForbiddenException('Cannot edit organization fields: form must be canceled or not yet approved');
    }
  }

  private async handleInnChange(
    formId: string,
    currentInn: string,
    newInn: string,
    updateData: IFormUpdate,
  ): Promise<void> {
    const allFieldsProvided =
      updateData.organizationName && updateData.organizationFullName && updateData.organizationBusinessForm;

    if (!allFieldsProvided) {
      throw new BadRequestException(
        'When changing INN, you must provide organizationName, organizationFullName, and organizationBusinessForm',
      );
    }

    this.logger.log(`INN changed for form ${formId}: ${currentInn} → ${newInn}. Attempting Kontur enrichment.`);

    const enrichedOrgData = await this.enrichFormPaymentOrganizationFromKontur(newInn, {
      name: updateData.organizationName,
      fullName: updateData.organizationFullName,
      businessForm: updateData.organizationBusinessForm as OrganizationBusinessFormType,
    });

    updateData.organizationName = enrichedOrgData.name;
    updateData.organizationFullName = enrichedOrgData.fullName;
    updateData.organizationBusinessForm = enrichedOrgData.businessForm as string;
  }

  private handleNameFieldsWithoutInnChange(formPayment: FormPaymentWithAccountDto): void {
    const canceledByStaff = [
      FormPaymentStatus.CANCELED_BY_MANAGER,
      FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
      FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
    ].includes(formPayment.status);

    if (!canceledByStaff) {
      this.logger.warn(
        `User attempted to edit organization fields for form ${formPayment._id} without INN change. Status: ${formPayment.status}`,
      );
      throw new ForbiddenException('Cannot edit organization fields without changing INN');
    }

    this.logger.log(
      `Allowing direct organization field update for form ${formPayment._id}. Status: ${formPayment.status}`,
    );
  }

  isCorporateClient(formPayment: IFormPayment): boolean {
    return this.isCorporate(formPayment);
  }

  private isCorporate(formPayment: IFormPayment | FormPaymentWithAccountDto): boolean {
    const account = (formPayment as FormPaymentWithAccountDto).account;
    return !!(
      typeof account === 'object' &&
      account !== null &&
      'isCorporateClient' in account &&
      (account as IAccount).isCorporateClient === true
    );
  }

  private isPostpayModesEnabled(): boolean {
    return Boolean(this.configService.get('features.vm3Vm4.enabled'));
  }

  private hasRateOrFeeChangesRequested(updateData: IFormUpdate): boolean {
    const currencyUpdate: Partial<IFormPaymentCurrency> = updateData.currency || {};
    const totalsUpdate: Partial<IFormPaymentTotals> = updateData.totals || {};

    return (
      _.has(currencyUpdate, 'rate') ||
      _.has(currencyUpdate, 'base') ||
      _.has(currencyUpdate, 'fixFee') ||
      _.has(currencyUpdate, 'fixFeeRate') ||
      _.has(totalsUpdate, 'feePercent') ||
      _.has(totalsUpdate, 'feeFix') ||
      _.has(totalsUpdate, 'feeFixCover') ||
      _.has(totalsUpdate, 'feeAmount') ||
      _.has(totalsUpdate, 'coverAmount')
    );
  }

  private hasInvoiceContractField(invoice: unknown): invoice is IFormPaymentInvoice & { contract?: IFile | string } {
    if (invoice === null || typeof invoice !== 'object') {
      return false;
    }

    if (!this.hasContractProperty(invoice)) {
      return false;
    }

    const { contract } = invoice;

    return typeof contract === 'string' || _.isObject(contract);
  }

  private hasContractProperty(invoice: object): invoice is { contract?: unknown } {
    return 'contract' in invoice;
  }

  private hasRole(ctx: FeatureContext, role: AccountRole): boolean {
    return Boolean(ctx.accountRoles?.includes(role));
  }

  private isManagerOrRoot(ctx: FeatureContext): boolean {
    return this.hasRole(ctx, AccountRole.MANAGER) || this.hasRole(ctx, AccountRole.ROOT);
  }

  private isTreasurer(ctx: FeatureContext): boolean {
    return this.hasRole(ctx, AccountRole.TREASURER);
  }

  private resolveNextPaymentScenario(formPayment: FormPaymentWithAccountDocsDto, updateData: IFormUpdate) {
    const nextPlatformPaymentCondition = updateData.platformPaymentCondition ?? formPayment.platformPaymentCondition;
    const nextPlatformPostpayMode = updateData.platformPostpayMode ?? formPayment.platformPostpayMode;

    const isPostpayRateOnProviderMode =
      nextPlatformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      nextPlatformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP;
    const isPostpayFixedRateMode =
      nextPlatformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      nextPlatformPostpayMode === PlatformPostpayMode.POSTPAY_FIXED_RATE;

    return {
      nextPlatformPaymentCondition,
      nextPlatformPostpayMode,
      isPostpayRateOnProviderMode,
      isPostpayFixedRateMode,
    };
  }

  private resolveRecalculationFlags(
    formPayment: FormPaymentWithAccountDocsDto,
    updateData: IFormUpdate,
    scenario: {
      hasPaymentScenarioChanges: boolean;
      isPostpayRateOnProviderMode: boolean;
      isPostpayFixedRateMode: boolean;
    },
  ) {
    // Нужно пересчитать суммы и курс если:
    // Экспорт и провайдер подтвердил получение средств от контрагента
    const isExportAndProviderAcceptPayment =
      formPayment.direction === FormPaymentDirection.EXPORT && updateData.status === FormPaymentStatus.PAYMENT_RECEIVED;
    // Импорт и менеджер поменял способ оплаты или провайдер подтвердил перевод средств на контрагента
    const isImportAndPlatformPostPayment =
      formPayment.direction === FormPaymentDirection.IMPORT &&
      (updateData.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT ||
        (updateData.status === FormPaymentStatus.PAYMENT_SENT &&
          formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT));

    const hasPaymentChanges = scenario.hasPaymentScenarioChanges;

    const targetStatus = updateData.status ?? formPayment.status;
    const isFormAcceptedTarget = targetStatus === FormPaymentStatus.FORM_ACCEPTED;
    const needFixedRateInitialFix =
      scenario.isPostpayFixedRateMode &&
      formPayment.direction === FormPaymentDirection.IMPORT &&
      isFormAcceptedTarget &&
      !formPayment.currency?.rate;

    const needRecalculation =
      (!scenario.isPostpayRateOnProviderMode &&
        !scenario.isPostpayFixedRateMode &&
        (isExportAndProviderAcceptPayment || isImportAndPlatformPostPayment || hasPaymentChanges)) ||
      (scenario.isPostpayFixedRateMode && hasPaymentChanges) ||
      needFixedRateInitialFix;

    return { needRecalculation, needFixedRateInitialFix };
  }

  private async buildPostpayRateAndTotals(
    formPayment: FormPaymentWithAccountDto,
  ): Promise<Pick<IFormUpdate, 'currency' | 'totals'>> {
    if (!formPayment.currency) {
      throw new BadRequestException('Form currency is not specified');
    }
    if (!formPayment.totals) {
      throw new BadRequestException('Form totals is not specified');
    }

    const normalizedCounterpartyCurrency = this.normalizeCurrencySymbol(formPayment.currency.counterparty);
    const normalizedClientCurrency = this.normalizeCurrencySymbol(formPayment.currency.client);

    if (!normalizedCounterpartyCurrency || !normalizedClientCurrency) {
      throw new BadRequestException('Client or counterparty currency is not supported');
    }

    const conversionNeeded = normalizedCounterpartyCurrency !== normalizedClientCurrency;
    const frontendRate = conversionNeeded
      ? (
          await this.rateService.resolveDealRate({
            account: formPayment.account,
            clientCurrency: normalizedClientCurrency,
            counterpartyCurrency: normalizedCounterpartyCurrency,
          })
        ).frontendRate
      : 1;

    const currency: IFormPaymentCurrency = {
      ...formPayment.currency,
      base: normalizedCounterpartyCurrency,
      rate: frontendRate,
    };

    const feePercentBps = _.isNumber(formPayment.totals.feePercent)
      ? formPayment.totals.feePercent
      : _.isNumber(formPayment.account?.feePercent)
      ? formPayment.account.feePercent
      : 0;

    const totals: IFormPaymentTotals = {
      ...formPayment.totals,
      feePercent: feePercentBps,
    };

    const amountMinor = Math.round(formPayment.totals.amount);
    const coverAmountMinor = this.rateService.calcCoverAmount({
      amountMinor,
      frontendRate,
    });

    totals.coverAmount = coverAmountMinor;
    const existingFeeFixCoverMinor = _.isNumber(formPayment.totals.feeFixCover) ? formPayment.totals.feeFixCover : 0;

    let feeFixCoverMinor = existingFeeFixCoverMinor;
    if (feeFixCoverMinor === 0 && _.isNumber(formPayment.totals.feeFix)) {
      const fixFeeCurrency =
        this.normalizeCurrencySymbol(formPayment.currency.fixFeeCurrency) ?? normalizedClientCurrency;
      const fixFeeRate = formPayment.currency.fixFeeRate;

      if (fixFeeCurrency === normalizedClientCurrency) {
        feeFixCoverMinor = formPayment.totals.feeFix;
      } else if (typeof fixFeeRate === 'number' && fixFeeRate > 0) {
        feeFixCoverMinor = Math.round(
          this.rateService.calcCoverAmount({
            amountMinor: formPayment.totals.feeFix,
            frontendRate: fixFeeRate,
          }),
        );
      }
    }

    if (feeFixCoverMinor) {
      totals.feeFixCover = feeFixCoverMinor;
    }

    totals.feeAmount = Math.round(((coverAmountMinor ?? 0) * (feePercentBps || 0)) / 10000) + (feeFixCoverMinor || 0);

    return { currency, totals };
  }

  private validatePaymentScenarioChange(params: {
    formPayment: FormPaymentWithAccountDocsDto;
    updateData: IFormUpdate;
    postpayModesEnabled: boolean;
    nextPlatformPaymentCondition: FormPaymentCondition;
    nextPlatformPostpayMode?: PlatformPostpayMode;
    isManagerAction: boolean;
  }) {
    const {
      formPayment,
      updateData,
      postpayModesEnabled,
      nextPlatformPaymentCondition,
      nextPlatformPostpayMode,
      isManagerAction,
    } = params;

    if (
      (!_.isNil(updateData.platformPaymentCondition) &&
        updateData.platformPaymentCondition !== formPayment.platformPaymentCondition) ||
      (!_.isNil(updateData.platformPostpayMode) && updateData.platformPostpayMode !== formPayment.platformPostpayMode)
    ) {
      if (!isManagerAction) {
        throw new ForbiddenException('Only manager or root can change payment scenario');
      }

      if (!this.canChangePaymentScenario(formPayment)) {
        throw new BadRequestException('Payment scenario can not be changed in current status');
      }

      if (nextPlatformPaymentCondition === FormPaymentCondition.POST_PAYMENT && !formPayment.account.enablePostpay) {
        throw new BadRequestException('Postpay is not available to this client');
      }

      if (!postpayModesEnabled) {
        if (nextPlatformPostpayMode && nextPlatformPostpayMode !== PlatformPostpayMode.LEGACY) {
          throw new BadRequestException('Postpay modes are disabled');
        }
        if (nextPlatformPaymentCondition === FormPaymentCondition.POST_PAYMENT && !nextPlatformPostpayMode) {
          updateData.platformPostpayMode = PlatformPostpayMode.LEGACY;
        }
      }

      if (
        !_.isNil(updateData.platformPostpayMode) &&
        nextPlatformPaymentCondition !== FormPaymentCondition.POST_PAYMENT
      ) {
        throw new BadRequestException('platformPostpayMode can only be set for post payment forms');
      }
    }
  }

  private async applyTreasurerStatusTransition(formPayment: IFormPayment, updateData: IFormUpdate) {
    if (!updateData.status) {
      return;
    }

    if (
      formPayment.status === FormPaymentStatus.PAYMENT_PROCESSING &&
      updateData.status === FormPaymentStatus.PAYMENT_RECEIVED
    ) {
      return;
    }

    const allowedNextStatuses = TREASURER_STATUS_GRAPH[formPayment.status] || [];
    const isSameStatus = updateData.status === formPayment.status;
    const isAllowedTreasurerTransition =
      isSameStatus ||
      allowedNextStatuses.includes(updateData.status) ||
      (formPayment.status === FormPaymentStatus.PAYMENT_PROCESSING &&
        updateData.status === FormPaymentStatus.PAYMENT_RECEIVED);

    if (!isAllowedTreasurerTransition) {
      throw new BadRequestException(
        `Treasurer can not transit status from ${formPayment.status} to ${updateData.status}`,
      );
    }

    const treasurerHandler = TREASURER_STATUS_HANDLERS[updateData.status];
    if (treasurerHandler) {
      await treasurerHandler({ formPayment, updateData });
    }
  }

  private canChangePaymentScenario(formPayment: FormPaymentWithAccountDocsDto): boolean {
    const blockedStatuses = new Set<FormPaymentStatus>([
      FormPaymentStatus.PAYMENT_PROCESSING,
      FormPaymentStatus.PAYMENT_SENT,
      FormPaymentStatus.PAYMENT_RECEIVED,
      FormPaymentStatus.REPORT_WAITING,
      FormPaymentStatus.REPORT_WAITING_VERIFICATION,
      FormPaymentStatus.REPORT_VERIFICATION,
      FormPaymentStatus.REPORT_ACCEPTED,
      FormPaymentStatus.SHIPMENT_WAITING,
      FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
      FormPaymentStatus.SHIPMENT_VERIFICATION,
      FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
      FormPaymentStatus.COMPLETED,
      FormPaymentStatus.PAYMENT_REFUND_WAITING,
      FormPaymentStatus.PAYMENT_REFUND_PROCESSING,
      FormPaymentStatus.PAYMENT_REFUND_SENT,
      FormPaymentStatus.CANCELED_BY_MANAGER,
      FormPaymentStatus.CANCELED_BY_USER,
      FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
      FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
    ]);

    return !blockedStatuses.has(formPayment.status);
  }

  private applyCorporateAutoComplete(formPayment: IFormPayment, updateData: IFormUpdate): void {
    if (!updateData.status) {
      return;
    }

    if (!this.isCorporate(formPayment)) {
      return;
    }

    if (
      updateData.status === FormPaymentStatus.REPORT_ACCEPTED ||
      updateData.status === FormPaymentStatus.PAYMENT_SENT
    ) {
      updateData.status = FormPaymentStatus.COMPLETED;
    }
  }

  private applyOrganizationFieldsUpdate(updateData: IFormUpdate): void {
    const orgUpdate: Record<string, unknown> = {};

    if (updateData.organizationName) {
      orgUpdate.name = updateData.organizationName;
      delete updateData.organizationName;
    }

    if (updateData.organizationFullName) {
      orgUpdate.fullName = updateData.organizationFullName;
      delete updateData.organizationFullName;
    }

    if (updateData.organizationBusinessForm) {
      orgUpdate.businessForm = updateData.organizationBusinessForm;
      delete updateData.organizationBusinessForm;
    }

    if (updateData.organizationInn) {
      orgUpdate.inn = updateData.organizationInn;
      delete updateData.organizationInn;
    }

    updateData.organization = {
      ...(typeof updateData.organization === 'object' ? updateData.organization : {}),
      ...orgUpdate,
      isChanged: true,
    } as IFormUpdateClientOrganizationByAdmin;
  }

  async orderByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await this.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (updateData.paymentOrderSigned) {
      if (
        ![FormPaymentStatus.SIGNING_ORDER, FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS].includes(
          formPayment.status,
        )
      ) {
        throw new BadRequestException('Can not update docs');
      }

      const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
        _id: updateData.paymentOrderSigned,
        account: findData.account,
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    // SIGNING_ORDER_WAITING_VERIFICATION

    if (updateData.status) {
      updateData.prevStatus = formPayment.status;
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    if (updateData.status) {
      // Обновляем виртуальные счета при изменении статуса
      if (formPayment.status !== updateData.status) {
        this.virtualAccountUpdateService
          .updateVirtualAccountsOnStatusChange(updatedForm, formPayment.status, updateData.status)
          .catch((err) => {
            this.logger.error(
              `Error updating virtual accounts in orderByUser for form payment ${updatedForm._id}: ${err.message}`,
            );
          });
      }
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  async advanceOrderByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (
      ![FormPaymentStatus.ADVANCE_SIGNING_ORDER, FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS].includes(
        formPayment.status,
      )
    ) {
      throw new BadRequestException('Can not update docs');
    }

    if (updateData.paymentOrderSigned) {
      const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
        _id: updateData.paymentOrderSigned,
        account: findData.account,
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    // ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION

    if (updateData.status) {
      updateData.prevStatus = formPayment.status;
    }

    let paymentOrderSigned = formPayment.docs.paymentOrderSigned as string[];

    if (
      [
        FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
        FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
      ].includes(formPayment.status)
    ) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: paymentOrderSigned,
        account: findData.account,
      });

      paymentOrderSigned = _.map(files, '_id');
      paymentOrderSigned.pop();
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    if (updateData.status) {
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  /**
   * Fixes exchange rate for a deal and recalculates commission.
   */
  async fixRate(
    formPaymentId: string,
    options?: {
      mode?: 'auto' | 'manual';
      rate?: number;
      payDate?: Date;
      feePercentBps?: number;
      feeFixMinor?: number;
      feeFixCurrency?: AllCurrencies;
      feeFixRate?: number;
    },
  ): Promise<IFormPayment> {
    const { formPayment, account, isFirstFixation } = await this.loadFormPaymentWithAccount(formPaymentId);
    const isRateOnProviderPostpayImport = this.isRateOnProviderPostpayImportScenario({
      direction: formPayment.direction,
      platformPaymentCondition: formPayment.platformPaymentCondition,
      platformPostpayMode: formPayment.platformPostpayMode,
    });

    const hasFeeTermsUpdate =
      options?.feePercentBps !== undefined ||
      options?.feeFixMinor !== undefined ||
      options?.feeFixCurrency !== undefined;
    const hasExplicitRateFixationInput = options?.rate !== undefined || options?.feeFixRate !== undefined;
    const canUpdateFeeTermsOnly =
      hasFeeTermsUpdate &&
      !hasExplicitRateFixationInput &&
      (options?.payDate === undefined || formPayment.status === FormPaymentStatus.FORM_ACCEPTED);
    const canFixRateNow = RATE_ON_PROVIDER_FIXATION_ALLOWED_STATUSES.has(formPayment.status);
    const feeTermsLocked = isRateOnProviderPostpayImport && this.isPrimaryOrderSigned(formPayment);

    if (feeTermsLocked && hasFeeTermsUpdate) {
      throw new BadRequestException('Rate-on-provider postpay: fee terms can be changed only before signing order');
    }

    if (isRateOnProviderPostpayImport && !canFixRateNow) {
      if (canUpdateFeeTermsOnly) {
        return this.updateRateOnProviderFeeTermsOnly({
          formPaymentId,
          formPayment,
          feePercentBps: options?.feePercentBps,
          feeFixMinor: options?.feeFixMinor,
          feeFixCurrency: options?.feeFixCurrency,
        });
      }
      throw new BadRequestException('Rate-on-provider postpay: rate can be fixed only at provider payment stage');
    }

    if (isRateOnProviderPostpayImport && options?.payDate && !_.isDate(options.payDate)) {
      throw new BadRequestException('payDate must be a Date');
    }

    if (isRateOnProviderPostpayImport && options?.payDate && formPayment.paymentByProviderDate !== options.payDate) {
      await this.updateOne(
        { _id: formPaymentId },
        {
          paymentByProviderDate: options.payDate,
        },
      );
    }

    const mode = options?.mode || 'auto';
    const hasRateSettings = this.hasAccountRateSettings(account);
    this.logger.log(`Fixing rate for formPayment ${formPaymentId}: hasRateSettings=${hasRateSettings}, mode=${mode}`);

    const rateOverride = options?.rate;

    const counterpartyCurrency = this.normalizeCurrencySymbol(formPayment.currency?.counterparty);
    const clientCurrency = this.normalizeCurrencySymbol(formPayment.currency?.client);

    if (!counterpartyCurrency) {
      throw new BadRequestException(
        `Cannot fix rate: counterparty currency is missing for formPayment ${formPaymentId}`,
      );
    }

    if (mode === 'manual') {
      return this.handleManualFixation({
        formPaymentId,
        formPayment,
        account,
        rateOverride,
        isFirstFixation,
        feePercentBps: options?.feePercentBps,
        feeFixMinor: options?.feeFixMinor,
        feeFixCurrency: options?.feeFixCurrency,
        feeFixRate: options?.feeFixRate,
      });
    }

    let backendRate: number;
    let frontendRate: number;
    let rateSource: RateValueSource;
    try {
      const resolved = await this.rateService.resolveDealRate({
        account,
        clientCurrency: clientCurrency || AllCurrencies.RUB,
        counterpartyCurrency,
        overrideRate: rateOverride,
      });
      backendRate = resolved.backendRate;
      frontendRate = resolved.frontendRate;
      rateSource = resolved.rateSource;
    } catch (err) {
      this.logger.error(
        `Failed to resolve deal rate for formPayment ${formPaymentId} (${clientCurrency}->${counterpartyCurrency}): ${
          err instanceof Error ? err.message : err
        }. Falling back to rate=1`,
      );
      backendRate = 1;
      frontendRate = 1;
      rateSource =
        rateOverride !== undefined && rateOverride !== null ? RateValueSource.MANUAL : RateValueSource.OPEN_EXCHANGE;
    }

    const amountMinor = formPayment.totals?.amount ?? 0;
    const computedCoverAmount =
      frontendRate && frontendRate > 0
        ? this.rateService.calcCoverAmount({
            amountMinor,
            frontendRate,
          })
        : undefined;

    const dealAmountMinorForCommission =
      computedCoverAmount ?? formPayment.totals?.coverAmount ?? formPayment.totals?.amount ?? 0;

    const normalizedClientCurrency = clientCurrency || AllCurrencies.RUB;
    const normalizedCounterpartyCurrency = counterpartyCurrency || AllCurrencies.RUB;
    const shouldUseFixedFeeTerms = isRateOnProviderPostpayImport;
    const commission = shouldUseFixedFeeTerms
      ? await this.buildCommissionFromFixedFeeTerms({
          formPayment,
          account,
          coverAmountMinor: dealAmountMinorForCommission,
          clientCurrency: normalizedClientCurrency,
          counterpartyCurrency: normalizedCounterpartyCurrency,
          frontendRate,
          rateSource,
        })
      : await this.commissionService.calculateCommission(
          account,
          dealAmountMinorForCommission,
          normalizedClientCurrency,
          normalizedCounterpartyCurrency,
          backendRate,
          { dealRateSourceOverride: rateSource },
        );

    return this.applyAutoFixation({
      formPaymentId,
      formPayment,
      account,
      isFirstFixation,
      rate: backendRate,
      frontendRate,
      commission,
      coverAmountMinor: computedCoverAmount,
      rateSource,
      preserveFeeTerms: isRateOnProviderPostpayImport,
    });
  }

  private async updateRateOnProviderFeeTermsOnly(params: {
    formPaymentId: string;
    formPayment: IFormPayment;
    feePercentBps?: number;
    feeFixMinor?: number;
    feeFixCurrency?: AllCurrencies;
  }): Promise<IFormPayment> {
    const { formPaymentId, formPayment, feePercentBps, feeFixMinor, feeFixCurrency } = params;

    let totals: IFormPaymentTotals | undefined;
    if (_.isNumber(feePercentBps) || _.isNumber(feeFixMinor)) {
      totals = { amount: formPayment.totals?.amount ?? 0 };
      if (_.isNumber(feePercentBps)) {
        totals.feePercent = feePercentBps;
      }
      if (_.isNumber(feeFixMinor)) {
        totals.feeFix = feeFixMinor;
      }
    }

    let currency: IFormPaymentCurrency | undefined;
    const normalizedFixFeeCurrency = this.normalizeCurrencySymbol(feeFixCurrency);
    if (normalizedFixFeeCurrency) {
      currency = {
        client: formPayment.currency?.client ?? AllCurrencies.RUB,
        counterparty: formPayment.currency?.counterparty ?? AllCurrencies.RUB,
        fixFeeCurrency: normalizedFixFeeCurrency,
      };
    }

    const updateData: IFormUpdate = { clearRatesMode: 'ratesOnly' };
    if (totals) {
      updateData.totals = totals;
    }
    if (currency) {
      updateData.currency = currency;
    }

    return this.updateOne({ _id: formPaymentId }, updateData);
  }

  private async resolveRateOnProviderFeeTerms(params: { formPayment: IFormPayment; account: IAccount }): Promise<{
    feePercentBps: number;
    feeFixMinor?: number;
    feeFixCurrency?: AllCurrencies;
  }> {
    const { formPayment, account } = params;

    if (!this.hasAccountRateSettings(account)) {
      return { feePercentBps: 250, feeFixMinor: 0 };
    }

    const amountMinor = Math.round(formPayment.totals?.amount ?? 0);
    const normalizedClientCurrency = this.normalizeCurrencySymbol(formPayment.currency?.client) ?? AllCurrencies.RUB;
    const normalizedCounterpartyCurrency =
      this.normalizeCurrencySymbol(formPayment.currency?.counterparty) ?? AllCurrencies.RUB;

    const commission = await this.commissionService.calculateCommission(
      account,
      amountMinor,
      normalizedClientCurrency,
      normalizedCounterpartyCurrency,
      1,
    );

    const feeFixFromMeta = commission.feeFixMeta?.amountMinor;
    const feeFixCurrency = commission.feeFixMeta?.currency;
    const feeFixMinor = feeFixFromMeta ?? (commission.feeFixMinor > 0 ? Math.round(commission.feeFixMinor) : 0);

    return {
      feePercentBps: commission.feePercentBps ?? 0,
      feeFixMinor,
      feeFixCurrency: feeFixCurrency ?? (commission.feeFixMinor > 0 ? normalizedClientCurrency : undefined),
    };
  }

  private async ensureRateOnProviderFeeTermsOnAccept(params: {
    formPayment: IFormPayment;
    account?: IAccount;
  }): Promise<IFormPayment> {
    const { formPayment } = params;

    if (formPayment.status !== FormPaymentStatus.FORM_ACCEPTED) {
      return formPayment;
    }

    if (
      !this.isRateOnProviderPostpayImportScenario({
        direction: formPayment.direction,
        platformPaymentCondition: formPayment.platformPaymentCondition,
        platformPostpayMode: formPayment.platformPostpayMode,
      })
    ) {
      return formPayment;
    }

    if (this.isPrimaryOrderSigned(formPayment)) {
      return formPayment;
    }

    const hasFeePercent = _.isNumber(formPayment.totals?.feePercent);
    const hasFeeFix = _.isNumber(formPayment.totals?.feeFix);
    const hasFixFeeCurrency = Boolean(this.normalizeCurrencySymbol(formPayment.currency?.fixFeeCurrency));

    if (hasFeePercent && hasFeeFix) {
      return formPayment;
    }

    const rawAccount =
      params.account && typeof params.account !== 'string'
        ? params.account
        : typeof formPayment.account !== 'string'
        ? (formPayment.account as IAccount)
        : undefined;
    const accountId = getIdFromAccount(rawAccount ?? formPayment.account);
    const account =
      rawAccount && rawAccount.rateSettings !== undefined
        ? rawAccount
        : await this.accountService.findOneOrException({ _id: accountId });

    const feeTerms = await this.resolveRateOnProviderFeeTerms({ formPayment, account });

    const feePercentBps = !hasFeePercent && _.isNumber(feeTerms.feePercentBps) ? feeTerms.feePercentBps : undefined;
    const feeFixMinor =
      !hasFeeFix && _.isNumber(feeTerms.feeFixMinor) && feeTerms.feeFixMinor > 0 ? feeTerms.feeFixMinor : undefined;
    const feeFixCurrency =
      !hasFixFeeCurrency && feeFixMinor !== undefined && feeTerms.feeFixCurrency ? feeTerms.feeFixCurrency : undefined;

    if (feePercentBps === undefined && feeFixMinor === undefined && feeFixCurrency === undefined) {
      return formPayment;
    }

    return this.updateRateOnProviderFeeTermsOnly({
      formPaymentId: String(formPayment._id),
      formPayment,
      feePercentBps,
      feeFixMinor,
      feeFixCurrency,
    });
  }

  private async buildCommissionFromFixedFeeTerms(params: {
    formPayment: IFormPayment;
    account: IAccount;
    coverAmountMinor: number;
    clientCurrency: AllCurrencies;
    counterpartyCurrency: AllCurrencies;
    frontendRate: number;
    rateSource: RateValueSource;
  }): Promise<ICommissionResult> {
    const { formPayment, account, coverAmountMinor, clientCurrency, counterpartyCurrency, frontendRate, rateSource } =
      params;

    const feePercentBps = _.isNumber(formPayment.totals?.feePercent) ? formPayment.totals.feePercent : 0;
    const feeFixBaseMinor = _.isNumber(formPayment.totals?.feeFix) ? formPayment.totals.feeFix : 0;
    const normalizedFixFeeCurrency = this.normalizeCurrencySymbol(formPayment.currency?.fixFeeCurrency);
    const existingFixFeeRate = formPayment.currency?.fixFeeRate;
    const existingFixFeeRateSource = formPayment.currency?.fixFeeRateSource;

    let feeFixCoverMinor = feeFixBaseMinor;
    let feeFixMeta: ICommissionResult['feeFixMeta'];

    if (normalizedFixFeeCurrency && feeFixBaseMinor > 0) {
      let nextFixFeeRate: number;
      let nextFixFeeRateSource: RateValueSource;

      if (typeof existingFixFeeRate === 'number' && existingFixFeeRate > 0) {
        nextFixFeeRate = existingFixFeeRate;
        nextFixFeeRateSource = existingFixFeeRateSource ?? RateValueSource.MANUAL;
      } else if (normalizedFixFeeCurrency === clientCurrency) {
        nextFixFeeRate = 1;
        nextFixFeeRateSource = existingFixFeeRateSource ?? RateValueSource.MANUAL;
      } else if (normalizedFixFeeCurrency === counterpartyCurrency && frontendRate > 0) {
        nextFixFeeRate = this.roundRate(frontendRate);
        nextFixFeeRateSource = rateSource;
      } else {
        const conversionRateSource =
          rateSource === RateValueSource.MANUAL
            ? this.resolveRateValueSourceForPricing(account, counterpartyCurrency, clientCurrency)
            : rateSource;
        const mappedSource =
          conversionRateSource === RateValueSource.OPEN_EXCHANGE ? CurrencySource.OPEN_EXCHANGE : CurrencySource.CBR;
        try {
          const conversion = await this.currencyService.convert({
            amount: 1,
            fromSymbol: normalizedFixFeeCurrency,
            toSymbol: clientCurrency,
            sources: [mappedSource],
            strategy: RateStrategy.BASE_WEAKER,
          });

          nextFixFeeRate = this.roundRate(conversion.rate);
          nextFixFeeRateSource = conversionRateSource;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed to resolve fixed fee rate ${normalizedFixFeeCurrency}->${clientCurrency} for formPayment ${formPayment._id}: ${message}`,
          );
          nextFixFeeRate = 1;
          nextFixFeeRateSource = RateValueSource.MANUAL;
        }
      }

      feeFixCoverMinor = Math.round(feeFixBaseMinor * nextFixFeeRate);
      feeFixMeta = {
        amountMinor: feeFixBaseMinor,
        currency: normalizedFixFeeCurrency,
        rateToClient: nextFixFeeRate,
        rateSource: nextFixFeeRateSource,
      };
    }

    const percentFeeMinor = Math.round((coverAmountMinor * feePercentBps) / 10000);
    const feeAmountMinor = percentFeeMinor + feeFixCoverMinor;

    return {
      feePercentBps,
      feeFixMinor: feeFixCoverMinor,
      feeAmountMinor,
      feeFixMeta,
    };
  }

  private hasAccountRateSettings(account: IFormPayment['account']): boolean {
    if (!account || typeof account === 'string') {
      return false;
    }

    const rateSettings = account.rateSettings;

    if (!rateSettings) {
      return false;
    }

    if (Array.isArray(rateSettings)) {
      return rateSettings.length > 0;
    }

    return true;
  }

  private isPricingFixed(form: IFormPayment): boolean {
    return Boolean(form.pricingMode || form.pricingFixedAt);
  }

  private isPrimaryOrderSigned(formPayment: IFormPayment): boolean {
    const signed = formPayment.docs?.paymentOrderSigned;
    return Array.isArray(signed) ? signed.length > 0 : Boolean(signed);
  }

  private hasRateOnProviderFeeTermsPatch(updateData: IFormUpdate): boolean {
    const totalsUpdate: Partial<IFormPaymentTotals> = updateData.totals || {};
    const currencyUpdate: Partial<IFormPaymentCurrency> = updateData.currency || {};

    return (
      _.has(totalsUpdate, 'feePercent') || _.has(totalsUpdate, 'feeFix') || _.has(currencyUpdate, 'fixFeeCurrency')
    );
  }

  private isRateOnProviderPostpayImportScenario(params: {
    direction: FormPaymentDirection;
    platformPaymentCondition?: FormPaymentCondition;
    platformPostpayMode?: PlatformPostpayMode;
  }): boolean {
    return (
      params.direction === FormPaymentDirection.IMPORT &&
      params.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      params.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP
    );
  }

  private hasRateOnProviderPricingPatch(updateData: IFormUpdate): boolean {
    const currencyUpdate: Partial<IFormPaymentCurrency> = updateData.currency || {};
    const totalsUpdate: Partial<IFormPaymentTotals> = updateData.totals || {};

    return (
      _.has(currencyUpdate, 'rate') ||
      _.has(currencyUpdate, 'rateSource') ||
      _.has(currencyUpdate, 'fixFeeRate') ||
      _.has(currencyUpdate, 'fixFeeRateSource') ||
      _.has(totalsUpdate, 'coverAmount') ||
      _.has(totalsUpdate, 'feeAmount') ||
      _.has(totalsUpdate, 'feeFixCover')
    );
  }

  private normalizeCurrencySymbol(value?: string): AllCurrencies | undefined {
    if (!value) {
      return undefined;
    }

    const lower = value.toLowerCase();
    const allowed = Object.values(AllCurrencies);

    return allowed.includes(lower as AllCurrencies) ? (lower as AllCurrencies) : undefined;
  }

  private resolveRateValueSourceForPricing(
    account: IAccount,
    counterpartyCurrency?: AllCurrencies,
    clientCurrency?: AllCurrencies,
  ): RateValueSource {
    const rateSettingsRaw = (account as unknown as { rateSettings?: unknown }).rateSettings;
    if (!rateSettingsRaw) {
      return RateValueSource.OPEN_EXCHANGE;
    }

    const settingsArray: Array<{ currencyScope?: unknown; rateSource?: unknown }> = Array.isArray(rateSettingsRaw)
      ? (rateSettingsRaw as Array<{ currencyScope?: unknown; rateSource?: unknown }>)
      : [rateSettingsRaw as { currencyScope?: unknown; rateSource?: unknown }];

    const normalizeScope = (value: unknown): string | undefined =>
      typeof value === 'string' ? value.toLowerCase() : undefined;

    const normalizedCounterparty = counterpartyCurrency?.toLowerCase();
    const normalizedClient = clientCurrency?.toLowerCase();

    const findSpecific = (currency?: string) =>
      settingsArray.find((s) => {
        const scope = normalizeScope(s.currencyScope);
        return Boolean(scope && scope !== 'all' && currency && scope === currency);
      });

    const findAll = () => settingsArray.find((s) => normalizeScope(s.currencyScope) === 'all');

    const applicable = findSpecific(normalizedCounterparty) || findSpecific(normalizedClient) || findAll();
    const rateSource = typeof applicable?.rateSource === 'string' ? applicable.rateSource : undefined;

    const normalizedRateSource = typeof rateSource === 'string' ? rateSource.toLowerCase() : undefined;
    if (normalizedRateSource === 'cbr') {
      return RateValueSource.CBR;
    }
    if (normalizedRateSource === 'openexchange') {
      return RateValueSource.OPEN_EXCHANGE;
    }
    return RateValueSource.OPEN_EXCHANGE;
  }

  private roundRate(rate: number): number {
    const RATE_PRECISION = 10000;
    return Math.round(rate * RATE_PRECISION) / RATE_PRECISION;
  }

  private stripAccountRateHistory(formPayment?: IFormPayment): void {
    if (!formPayment) {
      return;
    }

    const { account } = formPayment;
    if (account && typeof account === 'object' && 'rateHistory' in account) {
      delete (account as unknown as Record<string, unknown>).rateHistory;
    }
  }

  private stripRateHistoryFromForms(forms: IFormPayment[]): void {
    forms.forEach((form) => this.stripAccountRateHistory(form));
  }

  /**
   * После смены статуса при зафиксированной цене убеждаемся, что feeAmount включает фиксированную часть.
   * Иногда внешние переходы могут перетереть feeAmount до процентной составляющей.
   */
  private async ensureFixedCommissionConsistency(form: IFormPayment): Promise<IFormPayment> {
    const totals = form.totals;
    if (!totals) {
      return form;
    }

    const feeFix = totals.feeFixCover ?? 0;
    if (!feeFix) {
      return form;
    }

    const cover = totals.coverAmount ?? totals.amount ?? 0;
    const percentBps = totals.feePercent ?? 0;
    const percentFee = Math.round((cover * percentBps) / 10000);
    const expectedFeeAmount = percentFee + feeFix;

    if (totals.feeAmount === expectedFeeAmount) {
      return form;
    }

    const patched = await this.updateOne(
      { _id: form._id },
      {
        totals: {
          ...totals,
          feeAmount: expectedFeeAmount,
        },
      },
    );

    return patched;
  }

  private async loadFormPaymentWithAccount(
    formPaymentId: string,
  ): Promise<{ formPayment: IFormPayment; account: IAccount; isFirstFixation: boolean }> {
    const formPayment = await this.findOneOrException({ _id: formPaymentId }, { include: ['account'] });
    this.stripAccountRateHistory(formPayment);

    if (!formPayment) {
      throw new BadRequestException(`FormPayment ${formPaymentId} not found`);
    }

    const accountId = getIdFromAccount(formPayment.account);
    const account = await this.accountService.findOneOrException({ _id: accountId });

    if (!account) {
      throw new BadRequestException(`Account ${accountId} not found`);
    }

    return {
      formPayment,
      account,
      isFirstFixation: !formPayment.currency?.rate,
    };
  }

  private async handleManualFixation(params: {
    formPaymentId: string;
    formPayment: IFormPayment;
    account: IAccount;
    rateOverride?: number;
    isFirstFixation: boolean;
    feePercentBps?: number;
    feeFixMinor?: number;
    feeFixCurrency?: AllCurrencies;
    feeFixRate?: number;
  }): Promise<IFormPayment> {
    const {
      formPaymentId,
      formPayment,
      account,
      rateOverride,
      isFirstFixation,
      feePercentBps,
      feeFixMinor,
      feeFixCurrency,
      feeFixRate,
    } = params;
    const rate = rateOverride ?? formPayment.currency?.rate;
    const nextRateSource =
      rateOverride !== undefined && rateOverride !== null
        ? RateValueSource.MANUAL
        : formPayment.currency?.rateSource ?? RateValueSource.MANUAL;

    const currentTotals = formPayment.totals || { amount: 0 };
    const amountMinor = currentTotals.amount ?? 0;
    const clientCurrency = this.normalizeCurrencySymbol(formPayment.currency?.client) ?? AllCurrencies.RUB;
    const counterpartyCurrency = this.normalizeCurrencySymbol(formPayment.currency?.counterparty) ?? AllCurrencies.RUB;
    const conversionNeeded = clientCurrency !== counterpartyCurrency;

    const computedCoverAmount =
      _.isNumber(rate) && rate > 0
        ? this.rateService.calcCoverAmount({
            amountMinor,
            frontendRate: rate,
          })
        : undefined;

    const percent = feePercentBps ?? currentTotals.feePercent ?? 0;
    const coverAmountMinor =
      computedCoverAmount ?? currentTotals.coverAmount ?? (conversionNeeded ? undefined : amountMinor);

    const currentFeeFixBaseMinor = currentTotals.feeFix;
    const currentFeeFixCoverMinor = currentTotals.feeFixCover ?? 0;
    const currentFeeFixCurrency = this.normalizeCurrencySymbol(formPayment.currency?.fixFeeCurrency);
    const currentFixFeeRate = formPayment.currency?.fixFeeRate;
    const currentFixFeeRateSource = formPayment.currency?.fixFeeRateSource;

    const isExplicitFixFeeInput = feeFixCurrency !== undefined || feeFixRate !== undefined;
    const hasExistingFixFeeMeta =
      currentFeeFixBaseMinor !== undefined ||
      currentFeeFixCurrency !== undefined ||
      currentFixFeeRate !== undefined ||
      currentFixFeeRateSource !== undefined;

    const explicitFeeFixCurrency = this.normalizeCurrencySymbol(feeFixCurrency);
    const defaultFeeFixCurrency = counterpartyCurrency === AllCurrencies.EUR ? AllCurrencies.EUR : AllCurrencies.USD;

    let nextFeeFixCurrency: AllCurrencies;
    let nextFeeFixBaseMinor: number;
    let nextFixFeeRate: number;
    let nextFixFeeRateSource: RateValueSource;
    let nextFeeFixCoverMinor: number;

    if (isExplicitFixFeeInput || hasExistingFixFeeMeta) {
      // New semantics: feeFixMinor is fee amount in fee currency (stored in totals.feeFix)
      nextFeeFixCurrency = explicitFeeFixCurrency ?? currentFeeFixCurrency ?? defaultFeeFixCurrency;
      nextFeeFixBaseMinor = feeFixMinor ?? currentFeeFixBaseMinor ?? 0;

      if (feeFixRate !== undefined && feeFixRate !== null) {
        nextFixFeeRate = feeFixRate;
        nextFixFeeRateSource = RateValueSource.MANUAL;
      } else if (
        typeof currentFixFeeRate === 'number' &&
        currentFixFeeRateSource &&
        explicitFeeFixCurrency === undefined &&
        feeFixMinor === undefined
      ) {
        // Partial update: keep existing fee-rate metadata unless explicitly changed
        nextFixFeeRate = currentFixFeeRate;
        nextFixFeeRateSource = currentFixFeeRateSource;
      } else if (nextFeeFixCurrency === clientCurrency) {
        nextFixFeeRate = 1;
        nextFixFeeRateSource = currentFixFeeRateSource ?? RateValueSource.MANUAL;
      } else if (nextFeeFixCurrency === counterpartyCurrency && typeof rate === 'number' && rate > 0) {
        nextFixFeeRate = rate;
        nextFixFeeRateSource =
          rateOverride !== undefined && rateOverride !== null
            ? RateValueSource.MANUAL
            : this.resolveRateValueSourceForPricing(account, counterpartyCurrency, clientCurrency);
      } else {
        const valueSource = this.resolveRateValueSourceForPricing(account, counterpartyCurrency, clientCurrency);
        const mappedSource =
          valueSource === RateValueSource.OPEN_EXCHANGE ? CurrencySource.OPEN_EXCHANGE : CurrencySource.CBR;

        try {
          const conversion = await this.currencyService.convert({
            amount: 1,
            fromSymbol: nextFeeFixCurrency,
            toSymbol: clientCurrency,
            sources: [mappedSource],
            strategy: RateStrategy.BASE_WEAKER,
          });

          nextFixFeeRate = this.roundRate(conversion.rate);
          nextFixFeeRateSource = valueSource;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed to resolve fixed fee rate ${nextFeeFixCurrency}->${clientCurrency} for formPayment ${formPaymentId}: ${message}`,
          );
          nextFixFeeRate = 1;
          nextFixFeeRateSource = RateValueSource.MANUAL;
        }
      }

      nextFeeFixCoverMinor = Math.round(nextFeeFixBaseMinor * nextFixFeeRate);
    } else {
      // Legacy semantics: feeFixMinor is feeFixCover in client currency
      nextFeeFixCoverMinor = feeFixMinor ?? currentFeeFixCoverMinor ?? 0;
      nextFeeFixCurrency = clientCurrency;
      nextFeeFixBaseMinor = nextFeeFixCoverMinor;
      nextFixFeeRate = 1;
      nextFixFeeRateSource = RateValueSource.MANUAL;
    }

    const percentFeeMinor = _.isNumber(coverAmountMinor) ? Math.round((coverAmountMinor * percent) / 10000) : undefined;
    const feeAmountMinor =
      percentFeeMinor !== undefined
        ? percentFeeMinor + nextFeeFixCoverMinor
        : percent === 0
        ? nextFeeFixCoverMinor
        : undefined;

    const nextCurrency = formPayment.currency
      ? { ...formPayment.currency }
      : {
          client: AllCurrencies.RUB,
          counterparty: AllCurrencies.RUB,
        };

    if (typeof rate === 'number' && rate > 0) {
      nextCurrency.rate = rate;
      nextCurrency.rateSource = nextRateSource;
    }

    nextCurrency.fixFeeCurrency = nextFeeFixCurrency;
    nextCurrency.fixFeeRate = nextFixFeeRate;
    nextCurrency.fixFeeRateSource = nextFixFeeRateSource;

    const updateData: IFormUpdate = {
      currency: nextCurrency,
      totals: {
        ...currentTotals,
        ...(computedCoverAmount !== undefined ? { coverAmount: computedCoverAmount } : {}),
        feePercent: percent,
        feeFix: nextFeeFixBaseMinor,
        feeFixCover: nextFeeFixCoverMinor,
        ...(feeAmountMinor !== undefined ? { feeAmount: feeAmountMinor } : {}),
      },
    };

    if (typeof rate === 'number' && rate > 0) {
      updateData.pricingMode = 'manual';
      updateData.pricingFixedAt = new Date();
    }

    const updated = await this.updateOne({ _id: formPaymentId }, updateData);

    this.logger.log(
      typeof rate === 'number' && rate > 0
        ? `Rate manually fixed for formPayment ${formPaymentId}: rate=${rate}, commission=${updateData.totals?.feeAmount} minor`
        : `Manual commission updated for formPayment ${formPaymentId} without rate fixation`,
    );

    return updated;
  }

  private async applyAutoFixation(params: {
    formPaymentId: string;
    formPayment: IFormPayment;
    account: IAccount;
    isFirstFixation: boolean;
    rate: number;
    commission: ICommissionResult;
    frontendRate?: number;
    coverAmountMinor?: number;
    rateSource: RateValueSource;
    preserveFeeTerms?: boolean;
  }): Promise<IFormPayment> {
    const {
      formPaymentId,
      formPayment,
      account,
      isFirstFixation,
      rate,
      commission,
      frontendRate: providedFrontendRate,
      coverAmountMinor,
      rateSource,
      preserveFeeTerms,
    } = params;

    const normalizedClientCurrency = this.normalizeCurrencySymbol(formPayment.currency?.client);
    const normalizedCounterpartyCurrency = this.normalizeCurrencySymbol(formPayment.currency?.counterparty);

    const isCrossCurrency =
      normalizedClientCurrency &&
      normalizedCounterpartyCurrency &&
      normalizedClientCurrency !== normalizedCounterpartyCurrency;

    const frontendRate = providedFrontendRate ?? (isCrossCurrency ? rate : 1);

    const updateData: IFormUpdate = {
      pricingMode: 'auto_account_rules',
      pricingFixedAt: new Date(),
    };

    const nextCurrency = formPayment.currency
      ? { ...formPayment.currency, rate: frontendRate, rateSource }
      : {
          client: AllCurrencies.RUB,
          counterparty: AllCurrencies.RUB,
          rate: frontendRate,
          rateSource,
        };

    if (commission.feeFixMeta && commission.feeFixMeta.amountMinor > 0) {
      nextCurrency.fixFeeCurrency = commission.feeFixMeta.currency;
      nextCurrency.fixFeeRate = commission.feeFixMeta.rateToClient;
      nextCurrency.fixFeeRateSource = commission.feeFixMeta.rateSource;
    } else {
      if (!preserveFeeTerms) {
        delete nextCurrency.fixFeeCurrency;
      }
      delete nextCurrency.fixFeeRate;
      delete nextCurrency.fixFeeRateSource;
    }

    updateData.currency = nextCurrency;

    const hasFeePercent = _.isNumber(formPayment.totals?.feePercent);
    const hasFeeFix = _.isNumber(formPayment.totals?.feeFix);
    const nextTotals = formPayment.totals ? { ...formPayment.totals } : { amount: 0 };

    if (coverAmountMinor !== undefined) {
      nextTotals.coverAmount = coverAmountMinor;
    }
    nextTotals.feeFixCover = commission.feeFixMinor;
    nextTotals.feeAmount = commission.feeAmountMinor;

    if (!preserveFeeTerms || hasFeePercent) {
      nextTotals.feePercent = commission.feePercentBps;
    } else {
      delete nextTotals.feePercent;
    }

    if (!preserveFeeTerms) {
      if (commission.feeFixMeta && commission.feeFixMeta.amountMinor > 0) {
        nextTotals.feeFix = commission.feeFixMeta.amountMinor;
      } else {
        delete nextTotals.feeFix;
      }
    } else if (hasFeeFix) {
      nextTotals.feeFix = formPayment.totals?.feeFix as number;
    } else {
      delete nextTotals.feeFix;
    }

    updateData.totals = nextTotals;

    const updated = await this.updateOne({ _id: formPaymentId }, updateData);

    this.logger.log(
      `Rate fixed (auto) for formPayment ${formPaymentId}: rate=${rate} (stored=${frontendRate}), commission=${commission.feeAmountMinor} minor`,
    );

    this.stripAccountRateHistory(updated);

    return updated;
  }

  // доки платежа или инфо о крипто транзакциях
  async updatePaymentsByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    const hadAddTransactions = Array.isArray(updateData.addTransactions) && updateData.addTransactions.length > 0;
    const actorAccountId = getIdFromAccount(findData.account ?? formPayment.account);

    // Запрещаем удалять информацию о платежах в несоответствующих статусах
    if (
      (updateData.removePayments?.length || updateData.removeTransactions?.length) &&
      ![
        FormPaymentStatus.SIGNING_ORDER,
        FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
        FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
        FormPaymentStatus.ADVANCE_SIGNING_ORDER,
        FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS,
        FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_VERIFICATION,
        FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
      ].includes(formPayment.status)
    ) {
      throw new BadRequestException('Can not remove docs');
    }

    if (updateData.addPayments?.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: updateData.addPayments,
        account: actorAccountId,
      });

      const fileIds = _.chain(files)
        .map((file) => file._id)
        .reject((file) => (formPayment.docs?.payments as string[])?.includes(file))
        .value();

      updateData.addPayments = _.intersection(updateData.addPayments, fileIds);
    }

    if (updateData.removePayments?.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: updateData.removePayments,
        account: actorAccountId,
      });

      updateData.removePayments = _.intersection(
        updateData.removePayments,
        _.map(files, (file) => file._id),
      );
    }

    // Обработка привязки экспортных сделок
    if (!_.isUndefined(updateData.linkedExportForms)) {
      updateData.linkedExportForms = await this.validateLinkedExportForms(
        updateData.linkedExportForms,
        updateData.direction || formPayment.direction,
        formPayment.account || findData.account,
      );
    }

    // добавление и удаление транзакций
    if (updateData.addTransactions?.length || updateData.removeTransactions?.length) {
      updateData.transactions = formPayment.transactions || [];

      if (updateData.addTransactions?.length) {
        const addTransactions = _.map(updateData.addTransactions, (transaction) => {
          return {
            ...transaction,
            account: actorAccountId,
            uuid: uuidv4(),
          };
        });

        updateData.transactions.push(...addTransactions);

        delete updateData.addTransactions;
      }

      if (updateData.removeTransactions?.length) {
        updateData.transactions = _.reject(updateData.transactions, (transaction) => {
          return _.some(updateData.removeTransactions, (removeTransaction) => {
            return transaction.uuid === removeTransaction.uuid && actorAccountId === transaction.account;
          });
        });

        delete updateData.removeTransactions;
      }
    }

    const hasNewPaymentsOrTransactions = (updateData.addPayments?.length ?? 0) > 0 || hadAddTransactions;

    const isImportPostpay =
      formPayment.direction === FormPaymentDirection.IMPORT &&
      formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT;
    const isPostpayFixedMode = formPayment.platformPostpayMode === PlatformPostpayMode.POSTPAY_FIXED_RATE;

    if (
      hasNewPaymentsOrTransactions &&
      isImportPostpay &&
      isPostpayFixedMode &&
      formPayment.stage === FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT
    ) {
      updateData.status = FormPaymentStatus.MANAGER_CHECKING;
    }

    updateData.prevStatus = formPayment.status;

    const updatedForm = await this.updateOne(findData, updateData, options);

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  // Добавление инвойса пользователем (без hsCodes)
  async addInvoiceByUser(findData: IFormPaymentQuery, invoice: IFormPaymentInvoice): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    const canEdit = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS].includes(formPayment.status);
    if (!canEdit) {
      throw new BadRequestException('Can not modify form payment');
    }

    if (this.hasInvoiceContractField(invoice)) {
      throw new BadRequestException('Contract must be attached to form, not invoice');
    }

    const normalizedInvoice = invoice as IFormPaymentInvoice;

    const sanitized: IFormPaymentInvoice = {
      file: normalizedInvoice.file,
      contractNumber: normalizedInvoice.contractNumber,
      contractDate: normalizedInvoice.contractDate,
      invoiceNumber: normalizedInvoice.invoiceNumber,
      invoiceDate: normalizedInvoice.invoiceDate,
      deadlineShipment: normalizedInvoice.deadlineShipment,
      kind: normalizedInvoice.kind,
      uuid: uuidv4(),
    };

    // Validate invoice and related files
    const fileIds = _.compact([sanitized.file]);
    if (fileIds.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, { _ids: fileIds });
      if (files.length !== fileIds.length) {
        throw new BadRequestException('File not found');
      }
      const isPdf = files.every((f) => f.mimeType === 'application/pdf');
      if (!isPdf) {
        throw new BadRequestException('Invoice must be pdf');
      }
    }

    // Доступ уже проверен через checkFormPaymentAccess, поэтому не проверяем account в запросе
    const updated = await this.model
      .findOneAndUpdate({ _id: findData._id }, { $push: { invoices: sanitized } }, { new: true })
      .exec();

    if (!updated) {
      throw new BadRequestException('Failed to add invoice');
    }

    // Trigger recognition if invoice has a file
    if (sanitized.file) {
      this.client.emit(RecognitionEventPattern.INVOICE_RECOGNIZE_MANY, updated);
    }

    const plainForm = await this.toPlain(updated);
    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: plainForm,
    });
    return plainForm;
  }

  // Удаление инвойса пользователем
  async removeInvoiceByUser(findData: IFormPaymentQuery, invoiceUuid: string): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    const canEdit = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS].includes(formPayment.status);
    if (!canEdit) {
      throw new BadRequestException('Can not modify form payment');
    }

    // Ensure invoice exists
    this.findInvoiceIndexInForm(formPayment, invoiceUuid);

    // Доступ уже проверен через checkFormPaymentAccess, поэтому не проверяем account в запросе
    const updated = await this.model
      .findOneAndUpdate({ _id: findData._id }, { $pull: { invoices: { uuid: invoiceUuid } } }, { new: true })
      .exec();

    if (!updated) {
      throw new BadRequestException(`Failed to remove invoice ${invoiceUuid}`);
    }

    const plainForm = await this.toPlain(updated);
    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: plainForm,
    });
    return plainForm;
  }

  // Обновление инвойса пользователем
  async updateInvoiceByUser(
    findData: IFormPaymentQuery,
    invoiceUuid: string,
    updateData: Partial<IFormPaymentInvoice>,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    const canEdit = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS].includes(formPayment.status);
    if (!canEdit) {
      throw new BadRequestException('Can not modify form payment');
    }

    if (this.hasInvoiceContractField(updateData)) {
      throw new BadRequestException('Contract must be attached to form, not invoice');
    }

    // Find and get existing invoice
    const invoiceIndex = this.findInvoiceIndexInForm(formPayment, invoiceUuid);
    const existingInvoice = formPayment.invoices[invoiceIndex];
    const invoiceUpdate = updateData as Partial<IFormPaymentInvoice>;

    // Build update object with only provided fields
    const updateFields: Record<string, unknown> = {};
    const allowedFields: Array<keyof IFormPaymentInvoice> = [
      'file',
      'contractNumber',
      'contractDate',
      'invoiceNumber',
      'invoiceDate',
      'deadlineShipment',
      'kind',
    ];

    for (const field of allowedFields) {
      if (invoiceUpdate[field] !== undefined) {
        updateFields[`invoices.$.${field}`] = invoiceUpdate[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    // Validate files if changed
    const newFileId = invoiceUpdate.file !== undefined ? invoiceUpdate.file : null;
    if (newFileId) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, { _ids: [newFileId] });
      if (files.length !== 1) {
        throw new BadRequestException('File not found');
      }
      const isPdf = files[0].mimeType === 'application/pdf';
      if (!isPdf) {
        throw new BadRequestException('Invoice must be pdf');
      }
    }

    // Update invoice
    // Доступ уже проверен через checkFormPaymentAccess, поэтому не проверяем account в запросе
    // Позиционный оператор $ автоматически обновит найденный элемент массива
    const updated = await this.model
      .findOneAndUpdate({ _id: findData._id, 'invoices.uuid': invoiceUuid }, { $set: updateFields }, { new: true })
      .exec();

    if (!updated) {
      throw new BadRequestException(`Failed to update invoice ${invoiceUuid}`);
    }

    // Trigger recognition if file changed
    const existingFileId = typeof existingInvoice.file === 'string' ? existingInvoice.file : existingInvoice.file?._id;
    const fileChanged = invoiceUpdate.file !== undefined && invoiceUpdate.file !== existingFileId;
    if (fileChanged && invoiceUpdate.file) {
      this.client.emit(RecognitionEventPattern.INVOICE_RECOGNIZE_MANY, updated);
    }

    const plainForm = await this.toPlain(updated);
    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: plainForm,
    });
    return plainForm;
  }

  // доки: отчет
  async reportByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (this.isCorporate(formPayment)) {
      throw new BadRequestException('Reports are skipped for corporate clients');
    }

    if (
      ![FormPaymentStatus.REPORT_WAITING, FormPaymentStatus.REPORT_WAITING_CORRECTIONS].includes(formPayment.status)
    ) {
      throw new BadRequestException('Can not put report docs');
    }

    if (updateData.reportSigned) {
      const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
        _id: updateData.reportSigned,
        account: findData.account,
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    // REPORT_WAITING_VERIFICATION

    if (updateData.status) {
      updateData.prevStatus = formPayment.status;
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    if (updateData.status) {
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  async reportByAdmin(
    findData: IFormPaymentQuery,
    updateData: IFormUpdateReportByAdmin,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);
    const isCorporateClient = this.isCorporate(formPayment);

    if (
      ![
        FormPaymentStatus.PAYMENT_SENT,
        FormPaymentStatus.REPORT_WAITING,
        FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
      ].includes(formPayment.status)
    ) {
      throw new BadRequestException('Can not put report docs');
    }

    if (updateData.reportSigned) {
      const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
        _id: updateData.reportSigned,
        account: findData.account,
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    const update: IFormUpdate = {
      ...updateData,
      status: FormPaymentStatus.SHIPMENT_WAITING,
      prevStatus: formPayment.status,
    };

    if (isCorporateClient) {
      update.status = FormPaymentStatus.REPORT_ACCEPTED;
      this.applyCorporateAutoComplete(formPayment, update);
    }

    const updatedForm = await this.updateOne(findData, update, options);

    this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  // доки: отгрузка
  async shipmentByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    // Для корпоративных клиентов закрывающие документы не требуются
    if (this.isCorporate(formPayment)) {
      // Сообщение унифицировано с существующими ошибками в сервисе
      throw new BadRequestException('Can not update docs');
    }

    if (
      ![
        FormPaymentStatus.SHIPMENT_WAITING,
        FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
        FormPaymentStatus.DRAFT,
        FormPaymentStatus.FORM_WAITING_CORRECTIONS,
      ].includes(formPayment.status)
    ) {
      throw new BadRequestException('Can not update docs');
    }

    if (updateData.addClosing?.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: updateData.addClosing,
        account: findData.account,
      });

      const fileIds = _.chain(files)
        .map((file) => file._id)
        .reject((file) => (formPayment.docs?.closing as string[])?.includes(file))
        .value();

      updateData.addClosing = _.intersection(updateData.addClosing, fileIds);
    }

    if (updateData.removeClosing?.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: updateData.removeClosing,
        account: findData.account,
      });

      updateData.removeClosing = _.intersection(
        updateData.removeClosing,
        _.map(files, (file) => file._id),
      );
    }

    // SHIPMENT_WAITING_VERIFICATION
    if (updateData.status) {
      if (
        ![FormPaymentStatus.SHIPMENT_WAITING, FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS].includes(
          formPayment.status,
        )
      ) {
        throw new BadRequestException('Can not apply');
      }

      updateData.prevStatus = formPayment.status;
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    if (updateData.status) {
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status);
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  // доки: дополнительные документы
  async updateAdditionalByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException({ _id: findData._id });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    if (updateData.addAdditional?.length) {
      updateData.addAdditional = await this.retrieveExistedFiles(updateData.addAdditional, (file) =>
        (formPayment.docs?.additional as string[])?.includes(file),
      );
    }

    if (updateData.removeAdditional?.length) {
      updateData.removeAdditional = await this.retrieveExistedFiles(updateData.removeAdditional);
    }

    const updatedForm = await this.updateOne(findData, updateData, options);

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  /*
                                  методы для провайдера
                                  **********************************************************************************************************************
                                  */

  async updateByAdmins(
    ctx: FeatureContext,
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const formPaymentModel = await super.findOneOrException(
      { _id: findData._id },
      {
        include: formPaymentPopulate.toInclude(),
      },
    );
    const formPayment = plainModelToClass(FormPaymentWithAccountDocsDto, formPaymentModel);

    const isManagerAction = this.isManagerOrRoot(ctx);
    const isTreasurerAction = this.isTreasurer(ctx);
    const postpayModesEnabled = this.isPostpayModesEnabled();
    const {
      nextPlatformPaymentCondition,
      nextPlatformPostpayMode,
      isPostpayRateOnProviderMode,
      isPostpayFixedRateMode,
    } = this.resolveNextPaymentScenario(formPayment, updateData);
    const postpayModeChanged =
      !_.isNil(updateData.platformPostpayMode) && updateData.platformPostpayMode !== formPayment.platformPostpayMode;
    const paymentConditionChanged =
      !_.isNil(updateData.platformPaymentCondition) &&
      updateData.platformPaymentCondition !== formPayment.platformPaymentCondition;
    const hasPaymentScenarioChanges = postpayModeChanged || paymentConditionChanged;
    const nextDirection = updateData.direction ?? formPayment.direction;
    const isRateOnProviderPostpayImport = this.isRateOnProviderPostpayImportScenario({
      direction: nextDirection,
      platformPaymentCondition: nextPlatformPaymentCondition,
      platformPostpayMode: nextPlatformPostpayMode,
    });

    if (this.hasRateOrFeeChangesRequested(updateData) && !isManagerAction) {
      throw new ForbiddenException('Only manager or root can change rates and fees');
    }

    this.validatePaymentScenarioChange({
      formPayment,
      updateData,
      postpayModesEnabled,
      nextPlatformPaymentCondition,
      nextPlatformPostpayMode,
      isManagerAction,
    });

    // Rate-on-provider postpay invariant:
    // - Before fixation, deal rate and derived totals must be absent.
    // - Fixation is done only via /rate in allowed statuses.
    if (isRateOnProviderPostpayImport) {
      if (this.isPrimaryOrderSigned(formPayment) && this.hasRateOnProviderFeeTermsPatch(updateData)) {
        throw new BadRequestException('Rate-on-provider postpay: fee terms can be changed only before signing order');
      }

      const isExplicitClearRequested = updateData.clearRates === true || Boolean(updateData.clearRatesMode);
      const isPricingAlreadyFixed = this.isPricingFixed(formPayment);

      if (!isExplicitClearRequested && this.hasRateOnProviderPricingPatch(updateData)) {
        throw new BadRequestException(
          'Rate-on-provider postpay: rate and derived totals can be fixed only at provider payment stage',
        );
      }

      const isPreFixStage = RATE_ON_PROVIDER_PRE_FIX_STAGES.has(formPayment.stage);
      if (isPreFixStage || !isPricingAlreadyFixed) {
        updateData.clearRatesMode = 'ratesOnly';
      }
    }

    // Удаляем amount из updateData.totals, чтобы исключить изменение суммы админом
    delete updateData.totals?.amount;
    delete updateData.totals?.feeFixCover;
    const isCorporateClient = this.isCorporate(formPayment);
    const isPaymentSentRequested = updateData.status === FormPaymentStatus.PAYMENT_SENT;

    // Если организация клиента заблокирована, то заявку можно только отменить
    if (
      formPayment.organization &&
      formPayment.organization.status === OrganizationStatus.BLOCKED &&
      (!updateData.status || !formPaymentCancellationStatuses.includes(updateData.status))
    ) {
      throw new BadRequestException('Organization is blocked. Form can only be cancelled.');
    }

    if (updateData.status) {
      if (isTreasurerAction) {
        await this.applyTreasurerStatusTransition(formPayment, updateData);
      }

      if (isCorporateClient) {
        const reportFlowStatuses = [
          FormPaymentStatus.REPORT_WAITING,
          FormPaymentStatus.REPORT_WAITING_VERIFICATION,
          FormPaymentStatus.REPORT_VERIFICATION,
        ];
        const shipmentFlowStatuses = [
          FormPaymentStatus.SHIPMENT_WAITING,
          FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
          FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS,
          FormPaymentStatus.SHIPMENT_VERIFICATION,
        ];

        if (reportFlowStatuses.includes(updateData.status)) {
          updateData.status = FormPaymentStatus.REPORT_ACCEPTED;
        }

        if (shipmentFlowStatuses.includes(updateData.status)) {
          throw new BadRequestException('Shipment docs are skipped for corporate clients');
        }
      }

      const isTreasurerPaymentReceivedTransition =
        isTreasurerAction && updateData.status === FormPaymentStatus.PAYMENT_RECEIVED;

      const isTreasurerOrderVerificationTransition =
        isTreasurerAction &&
        formPayment.status === FormPaymentStatus.ORDER_WAITING_CORRECTION_TREASURER &&
        updateData.status === FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER;

      const isManagerReturnToPaymentSent =
        isManagerAction &&
        updateData.status === FormPaymentStatus.PAYMENT_SENT &&
        formPayment.status === FormPaymentStatus.MANAGER_CHECKING &&
        updateData.isManagerReturnToPaymentSent;

      if (
        !isTreasurerPaymentReceivedTransition &&
        !isTreasurerOrderVerificationTransition &&
        !isManagerReturnToPaymentSent
      ) {
        const isCheckTransit = this.checkTransit({
          startStatus: formPayment.status,
          endStatus: updateData.status,
          direction: formPayment.direction,
          platformPostpayMode: formPayment.platformPostpayMode,
          isCorporateClient: this.isCorporate(formPayment),
        });

        if (!isCheckTransit) {
          throw new BadRequestException(`Can not transit status from ${formPayment.status} to ${updateData.status}`);
        }
      }

      if (updateData.status === FormPaymentStatus.CANCELED_BY_MANAGER && formPayment.totals?.feePaid) {
        throw new BadRequestException(`Can not cancel form payment. Fee already paid`);
      }

      // Когда внутренний комплаенс переводит в FORM_WAITING_VERIFICATION организация должна быть подтверждена
      if (
        updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION &&
        formPayment.organization &&
        formPayment.organization.status !== OrganizationStatus.APPROVED
      ) {
        throw new BadRequestException('Organization must be approved');
      }

      // Пропуск комплаенс проверок для скопированных форм с апрувленными организациями
      if (
        formPayment.sourceFormId && // Форма является скопированной
        formPayment.organization?.status === OrganizationStatus.APPROVED
      ) {
        if (updateData.status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION) {
          updateData.status = FormPaymentStatus.FORM_ACCEPTED; // По тз так, а по факту сомневаюсь, что должно так быть. А если орга проверена, а менеджером нет, и мы скопировали?
        }
      }

      // служебный флаг только для валидации перехода, в базу его не пишем
      if (updateData.isManagerReturnToPaymentSent) {
        delete updateData.isManagerReturnToPaymentSent;
      }

      updateData.prevStatus = formPayment.status;
    }

    if ([FormPaymentStatus.SIGNING_ORDER, FormPaymentStatus.ADVANCE_SIGNING_ORDER].includes(updateData.status)) {
      if (!formPayment.docs?.paymentOrder) {
        throw new BadRequestException('Payment order is not exists.');
      }
    }

    if (updateData.agent) {
      const contract = await this.client.send<IContract>(ContractPattern.FIND_ONE, {
        query: {
          organization: formPayment.organization._id,
          agent: updateData.agent,
        },
        options: {
          sort: '-createDate',
        },
      });

      if (contract?.status === ContractStatus.ACCEPTED) {
        // Если контракт подтвержден
        updateData.status = FormPaymentStatus.FORM_ACCEPTED;
      } else if (contract?.status === ContractStatus.CREATED) {
        // Если контракт создан но не подтвержден
        updateData.status = FormPaymentStatus.CONTRACT_VERIFICATION;
      } else if (contract?.status === ContractStatus.REJECTED) {
        // Если контракт ранее был отправлен на коррекцию
        updateData.status = FormPaymentStatus.CONTRACT_WAITING_CORRECTION;
      } else {
        // Если ни один из статусов не отработал или контракта нет
        updateData.status = FormPaymentStatus.CONTRACT_WAITING;
      }

      updateData.paymentOrder = null;
      updateData.paymentOrderDocx = null;
    }

    if (updateData.status === FormPaymentStatus.FORM_ACCEPTED && !updateData.agent && !formPayment.agent) {
      await this.setAgentByLastContract(formPayment, updateData);
    }

    /* TODO: отключаем автоматическую передачу поручения до проработки логики
    if (
      (updateData.agent || formPayment.agent) &&
      _.isNumber(formPayment.totals?.feePercent) &&
      !formPayment.docs?.paymentOrder &&
      updateData.status === FormPaymentStatus.FORM_ACCEPTED
    ) {
      const agentId = (updateData.agent as string) || formPayment.agent?._id.toString();
      const formWithSigningOrder = await this.generateSigningOrder(formPayment, agentId);

      if (formWithSigningOrder.docs?.paymentOrder) {
        updateData.status = FormPaymentStatus.SIGNING_ORDER;
      }
    }
    */

    if (updateData.paymentOrderSigned) {
      const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
        _id: updateData.paymentOrderSigned,
        account: findData.account,
      });

      if (file) {
        if (!updateData.docs) {
          updateData.docs = formPayment.docs;
        }
        updateData.docs.paymentOrderSigned = _.chain(formPayment.docs.paymentOrderSigned)
          .reject((file) => file.account === findData.account)
          .push(file)
          .value();
      }

      delete updateData.paymentOrderSigned;
    }

    if (updateData.addPayments?.length) {
      const paymentIds = _.map(formPayment.docs?.payments, '_id');

      updateData.addPayments = await this.retrieveExistedFiles(updateData.addPayments, (file) =>
        paymentIds.includes(file),
      );
    }

    if (updateData.removePayments?.length) {
      updateData.removePayments = await this.retrieveExistedFiles(updateData.removePayments);
    }

    // добавление и удаление транзакций
    if (updateData.addTransactions?.length || updateData.removeTransactions?.length) {
      updateData.transactions = formPayment.transactions || [];

      if (updateData.addTransactions?.length) {
        const addTransactions = _.map(updateData.addTransactions, (transaction) => {
          return {
            ...transaction,
            account: getIdFromAccount(findData.account),
            uuid: uuidv4(),
          };
        });

        updateData.transactions.push(...addTransactions);

        delete updateData.addTransactions;
      }

      if (updateData.removeTransactions?.length) {
        updateData.transactions = _.reject(updateData.transactions, (transaction) => {
          return _.some(updateData.removeTransactions, (removeTransaction) => {
            return transaction.uuid === removeTransaction.uuid;
          });
        });

        delete updateData.removeTransactions;
      }
    }

    // добавление и удаление транзакций по возврату
    if (updateData.addRefundTransactions?.length || updateData.removeRefundTransactions?.length) {
      updateData.refundTransactions = formPayment.refundTransactions || [];

      if (updateData.addRefundTransactions?.length) {
        const addRefundTransactions = _.map(updateData.addRefundTransactions, (transaction) => {
          return {
            ...transaction,
            account: getIdFromAccount(findData.account),
            uuid: uuidv4(),
          };
        });

        updateData.refundTransactions.push(...addRefundTransactions);

        delete updateData.addRefundTransactions;
      }

      if (updateData.removeRefundTransactions?.length) {
        updateData.refundTransactions = _.reject(updateData.refundTransactions, (transaction) => {
          return _.some(updateData.removeRefundTransactions, (removeTransaction) => {
            return transaction.uuid === removeTransaction.uuid && findData.account === transaction.account;
          });
        });

        delete updateData.removeRefundTransactions;
      }
    }

    if (updateData.addAdditional?.length) {
      updateData.addAdditional = await this.retrieveExistedFiles(updateData.addAdditional, (file) =>
        formPayment.docs?.additional?.some(({ _id }) => _id === file),
      );
    }

    if (updateData.removeAdditional?.length) {
      updateData.removeAdditional = await this.retrieveExistedFiles(updateData.removeAdditional);
    }

    if (updateData.addSwift?.length) {
      updateData.addSwift = await this.retrieveExistedFiles(updateData.addSwift, (file) =>
        formPayment.docs?.swift?.some(({ _id }) => _id === file),
      );
    }

    if (updateData.removeSwift?.length) {
      updateData.removeSwift = await this.retrieveExistedFiles(updateData.removeSwift);
    }

    if (_.isDate(updateData.totals?.paidDate) && updateData.totals?.paidDate !== formPayment.totals?.paidDate) {
      updateData.totals.isEventSentExpiresPaidDate = false;
    }

    // обрабатываем изменение формы оплаты агенту
    if (paymentConditionChanged) {
      if (
        !_.includes(
          [
            FormPaymentStatus.FORM_ACCEPTED,
            FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
            FormPaymentStatus.SIGNING_ORDER,
            FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
            FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          ],
          formPayment.status,
        )
      ) {
        throw new BadRequestException('Сan not change the payment condition at this status');
      }

      updateData.paymentAgencyFeeCondition = updateData.platformPaymentCondition;
      updateData.paymentOrder = null;
      updateData.paymentOrderDocx = null;
      updateData.status = FormPaymentStatus.FORM_ACCEPTED;
    }

    const isPricingAlreadyFixed = this.isPricingFixed(formPayment);
    const currencyPatch: Partial<IFormPaymentCurrency> = updateData.currency ?? {};
    const totalsPatch: Partial<IFormPaymentTotals> = updateData.totals ?? {};

    const normalizedClientCurrency = this.normalizeCurrencySymbol(currencyPatch.client ?? formPayment.currency?.client);
    const normalizedCounterpartyCurrency = this.normalizeCurrencySymbol(
      currencyPatch.counterparty ?? formPayment.currency?.counterparty,
    );
    const normalizedFixFeeCurrency = this.normalizeCurrencySymbol(
      currencyPatch.fixFeeCurrency ?? formPayment.currency?.fixFeeCurrency,
    );

    const isProviderRateSource = (source?: RateValueSource): boolean =>
      source === RateValueSource.CBR || source === RateValueSource.OPEN_EXCHANGE;

    // Enforce: provider sources for deal and fixed fee must match ('cbr' vs 'open-exchange' одновременно не допускается).
    if (
      isProviderRateSource(currencyPatch.rateSource) &&
      isProviderRateSource(currencyPatch.fixFeeRateSource) &&
      currencyPatch.rateSource !== currencyPatch.fixFeeRateSource
    ) {
      throw new BadRequestException('currency.rateSource and currency.fixFeeRateSource must match');
    }

    // If fixed-fee source is explicitly provided (provider), align deal source to it (deal rate will be recalculated below).
    if (
      currencyPatch.rate === undefined &&
      !currencyPatch.rateSource &&
      isProviderRateSource(currencyPatch.fixFeeRateSource)
    ) {
      currencyPatch.rateSource = currencyPatch.fixFeeRateSource;
    }

    // 1) Deal rate source & rate: when source changes, rate is recalculated.
    if (currencyPatch.rate !== undefined && currencyPatch.rate !== null) {
      currencyPatch.rateSource = RateValueSource.MANUAL;
    } else if (currencyPatch.rateSource !== undefined && currencyPatch.rateSource !== null) {
      if (currencyPatch.rateSource === RateValueSource.MANUAL) {
        throw new BadRequestException('currency.rate is required when currency.rateSource is manual');
      }

      if (!normalizedClientCurrency || !normalizedCounterpartyCurrency) {
        throw new BadRequestException(
          'currency.client and currency.counterparty are required to recalculate deal rate',
        );
      }

      if (normalizedClientCurrency === normalizedCounterpartyCurrency) {
        currencyPatch.rate = 1;
      } else {
        const mappedSource =
          currencyPatch.rateSource === RateValueSource.OPEN_EXCHANGE
            ? CurrencySource.OPEN_EXCHANGE
            : CurrencySource.CBR;

        const conversion = await this.currencyService.convert({
          amount: 1,
          fromSymbol: normalizedCounterpartyCurrency,
          toSymbol: normalizedClientCurrency,
          sources: [mappedSource],
          strategy: RateStrategy.BASE_WEAKER,
        });

        currencyPatch.rate = this.roundRate(conversion.rate);
      }
    }

    const nextDealRateSource =
      (currencyPatch.rateSource ??
        formPayment.currency?.rateSource ??
        this.resolveRateValueSourceForPricing(
          formPayment.account as IAccount,
          normalizedCounterpartyCurrency,
          normalizedClientCurrency,
        )) ||
      RateValueSource.OPEN_EXCHANGE;

    const nextDealFrontendRate = currencyPatch.rate ?? formPayment.currency?.rate;

    // 2) Fixed fee source & rate: inherits deal source unless explicitly manual.
    if (currencyPatch.fixFeeRate !== undefined && currencyPatch.fixFeeRate !== null) {
      currencyPatch.fixFeeRateSource = RateValueSource.MANUAL;
    } else if (currencyPatch.fixFeeRateSource !== undefined && currencyPatch.fixFeeRateSource !== null) {
      if (currencyPatch.fixFeeRateSource === RateValueSource.MANUAL) {
        throw new BadRequestException('currency.fixFeeRate is required when currency.fixFeeRateSource is manual');
      }
    } else {
      const existingFixFeeRateSource = formPayment.currency?.fixFeeRateSource;
      const shouldInheritDealSource = existingFixFeeRateSource !== RateValueSource.MANUAL;
      const hasFixedFeeContext =
        totalsPatch.feeFix !== undefined ||
        formPayment.totals?.feeFix !== undefined ||
        formPayment.currency?.fixFeeCurrency !== undefined ||
        formPayment.currency?.fixFeeRate !== undefined ||
        formPayment.currency?.fixFeeRateSource !== undefined;

      if (
        shouldInheritDealSource &&
        hasFixedFeeContext &&
        currencyPatch.rateSource !== undefined &&
        currencyPatch.rateSource !== null
      ) {
        currencyPatch.fixFeeRateSource = nextDealRateSource;
      }
    }

    const nextFixFeeRateSource =
      (currencyPatch.fixFeeRateSource ?? formPayment.currency?.fixFeeRateSource ?? nextDealRateSource) ||
      RateValueSource.OPEN_EXCHANGE;

    // Проверяем, есть ли уже существующее значение fixFeeRate в форме
    const existingFixFeeRate = formPayment.currency?.fixFeeRate;
    const hasExistingFixFeeRate = existingFixFeeRate !== undefined && existingFixFeeRate !== null;

    // Не перезаписываем fixFeeRate, если он не указан явно в updateData, но уже существует в форме
    const shouldSyncFixFeeRateToManualDealRate =
      currencyPatch.fixFeeRate === undefined &&
      !hasExistingFixFeeRate &&
      nextFixFeeRateSource === RateValueSource.MANUAL &&
      normalizedCounterpartyCurrency &&
      normalizedFixFeeCurrency &&
      normalizedFixFeeCurrency === normalizedCounterpartyCurrency &&
      typeof nextDealFrontendRate === 'number' &&
      nextDealFrontendRate > 0;

    if (shouldSyncFixFeeRateToManualDealRate) {
      currencyPatch.fixFeeRate = this.roundRate(nextDealFrontendRate);
    }

    const shouldRecalcFixFeeRate =
      currencyPatch.fixFeeRate === undefined &&
      !hasExistingFixFeeRate &&
      currencyPatch.fixFeeRateSource !== undefined &&
      currencyPatch.fixFeeRateSource !== null &&
      currencyPatch.fixFeeRateSource !== RateValueSource.MANUAL;

    const shouldRecalcFixFeeRateOnCurrencyChange =
      currencyPatch.fixFeeRate === undefined &&
      !hasExistingFixFeeRate &&
      currencyPatch.fixFeeCurrency !== undefined &&
      nextFixFeeRateSource !== RateValueSource.MANUAL;

    if (shouldRecalcFixFeeRate || shouldRecalcFixFeeRateOnCurrencyChange) {
      if (!normalizedFixFeeCurrency) {
        throw new BadRequestException('currency.fixFeeCurrency is required to recalculate fixed fee rate');
      }

      if (!normalizedClientCurrency) {
        throw new BadRequestException('currency.client is required to recalculate fixed fee rate');
      }

      if (normalizedFixFeeCurrency === normalizedClientCurrency) {
        currencyPatch.fixFeeRate = 1;
      } else if (
        normalizedCounterpartyCurrency &&
        normalizedFixFeeCurrency === normalizedCounterpartyCurrency &&
        typeof nextDealFrontendRate === 'number' &&
        nextDealFrontendRate > 0
      ) {
        currencyPatch.fixFeeRate = this.roundRate(nextDealFrontendRate);
      } else {
        const mappedSource =
          nextFixFeeRateSource === RateValueSource.OPEN_EXCHANGE ? CurrencySource.OPEN_EXCHANGE : CurrencySource.CBR;

        const conversion = await this.currencyService.convert({
          amount: 1,
          fromSymbol: normalizedFixFeeCurrency,
          toSymbol: normalizedClientCurrency,
          sources: [mappedSource],
          strategy: RateStrategy.BASE_WEAKER,
        });

        currencyPatch.fixFeeRate = this.roundRate(conversion.rate);
      }
    }

    const hasCurrencyPatch = Object.keys(currencyPatch).length > 0;
    const hasCurrencyRatePatch = currencyPatch.rate !== undefined;
    const hasFeePercentPatch = totalsPatch.feePercent !== undefined;
    const hasFeeFixPatch =
      totalsPatch.feeFix !== undefined ||
      currencyPatch.fixFeeRate !== undefined ||
      currencyPatch.fixFeeRateSource !== undefined ||
      currencyPatch.fixFeeCurrency !== undefined;

    const hasTotalsExplicitPatch = Object.keys(totalsPatch).length > 0;
    updateData.totals = { ...formPayment.totals, ...totalsPatch };
    updateData.currency = { ...formPayment.currency, ...currencyPatch };

    let coverAmount;
    if (hasCurrencyRatePatch && _.isNumber(updateData.currency?.rate) && updateData.currency.rate > 0) {
      coverAmount = updateData.totals.coverAmount = this.rateService.calcCoverAmount({
        amountMinor: formPayment.totals.amount,
        frontendRate: updateData.currency.rate,
      });
    }

    const shouldRecalcPercent =
      (hasFeePercentPatch || coverAmount !== undefined) && _.isNumber(updateData.totals?.feePercent);
    if (shouldRecalcPercent) {
      if (!hasFeeFixPatch) {
        const cover = coverAmount ?? updateData.totals.coverAmount ?? formPayment.totals?.coverAmount;
        if (_.isNumber(cover)) {
          const percentFee = Math.round((cover * updateData.totals.feePercent) / 10000);
          const fixedFeeCover = _.isNumber(updateData.totals.feeFixCover) ? updateData.totals.feeFixCover : 0;
          updateData.totals.feeAmount = percentFee + fixedFeeCover;
        }
      }
    }

    if (hasFeeFixPatch) {
      const feeFixMinor = updateData.totals?.feeFix;
      if (!_.isNumber(feeFixMinor)) {
        throw new BadRequestException('feeFix must be a number.');
      }

      const fixFeeCurrency = updateData.currency?.fixFeeCurrency;
      const fixFeeRate = updateData.currency?.fixFeeRate;

      const isFixFeeRateSpecified = fixFeeRate !== undefined;
      if (isFixFeeRateSpecified && (!_.isNumber(fixFeeRate) || fixFeeRate < 0)) {
        throw new BadRequestException('fixFeeRate must be a non-negative number.');
      }

      if (fixFeeCurrency === undefined && fixFeeRate !== undefined) {
        throw new BadRequestException('fixFeeCurrency is required when fixFeeRate is specified.');
      }

      const client = updateData.currency?.client;
      if (!client) {
        throw new BadRequestException('currency.client is required.');
      }

      if (fixFeeCurrency && fixFeeCurrency !== client) {
        if (!_.isNumber(fixFeeRate) || fixFeeRate < 0) {
          throw new BadRequestException('fixFeeRate is required when fixFeeCurrency differs from client currency.');
        }

        updateData.totals.feeFixCover = Math.round(
          this.rateService.calcCoverAmount({
            amountMinor: feeFixMinor,
            frontendRate: fixFeeRate,
          }),
        );
      } else {
        updateData.totals.feeFixCover = Math.round(feeFixMinor);
      }

      const cover = coverAmount ?? updateData.totals.coverAmount ?? formPayment.totals?.coverAmount;
      const percentBps = _.isNumber(updateData.totals?.feePercent) ? updateData.totals.feePercent : 0;
      const percentFee = _.isNumber(cover) ? Math.round((cover * percentBps) / 10000) : 0;
      const fixedFeeCover = _.isNumber(updateData.totals.feeFixCover) ? updateData.totals.feeFixCover : 0;
      updateData.totals.feeAmount = percentFee + fixedFeeCover;
    }

    if (updateData.status === FormPaymentStatus.REPORT_ACCEPTED) {
      // Для корпоративных клиентов пропускаем этап загрузки закрывающих документов
      this.applyCorporateAutoComplete(formPayment, updateData);
      if (updateData.status === FormPaymentStatus.REPORT_ACCEPTED) {
        updateData.status = formPayment.docs.closing?.length
          ? FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION
          : FormPaymentStatus.SHIPMENT_WAITING;
      }
    }

    const { needRecalculation, needFixedRateInitialFix } = this.resolveRecalculationFlags(formPayment, updateData, {
      hasPaymentScenarioChanges,
      isPostpayFixedRateMode,
      isPostpayRateOnProviderMode,
    });

    // Считаем курс и сумму к оплате
    if (needRecalculation) {
      const rateAndTotals = await this.buildPostpayRateAndTotals(formPayment);
      updateData.currency = rateAndTotals.currency;
      updateData.totals = rateAndTotals.totals;

      if (!needFixedRateInitialFix) {
        updateData.prevStatus = FormPaymentStatus.DRAFT;
      }
    }

    if (
      (updateData.status === FormPaymentStatus.PAYMENT_RECEIVED &&
        formPayment.direction === FormPaymentDirection.IMPORT) ||
      (updateData.status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
        formPayment.direction === FormPaymentDirection.EXPORT) ||
      (updateData.status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
        formPayment.direction === FormPaymentDirection.IMPORT &&
        formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT)
    ) {
      if (!formPayment.moveToProviderDate) {
        updateData.moveToProviderDate = new Date();
      }
      updateData.paymentByProviderDate = null;
    }

    if (
      (updateData.status === FormPaymentStatus.PAYMENT_SENT && formPayment.direction === FormPaymentDirection.IMPORT) ||
      (updateData.status === FormPaymentStatus.PAYMENT_RECEIVED &&
        formPayment.direction === FormPaymentDirection.EXPORT)
    ) {
      updateData.paymentByProviderDate = new Date();
    }

    // Clear pricing fields for postpay (except fixed-rate postpay mode)
    const shouldClearPostpayRates =
      nextPlatformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      (hasPaymentScenarioChanges || updateData.clearRates === true || Boolean(updateData.clearRatesMode));
    const skipClearForFixedMode =
      postpayModesEnabled && nextPlatformPostpayMode === PlatformPostpayMode.POSTPAY_FIXED_RATE;

    if (shouldClearPostpayRates && !skipClearForFixedMode) {
      updateData.totals = {
        ...formPayment.totals,
        ...updateData.totals,
      };
      updateData.currency = {
        ...formPayment.currency,
        ...updateData.currency,
      };

      const shouldClearPricing =
        // Rate-on-provider postpay: always clear rates/derived totals on scenario switch (even if pricing was fixed before).
        (isRateOnProviderPostpayImport && hasPaymentScenarioChanges) ||
        // other scenarios: keep previous behavior (don't clear fixed pricing unless explicitly requested)
        !isPricingAlreadyFixed ||
        updateData.clearRates === true ||
        Boolean(updateData.clearRatesMode);

      if (shouldClearPricing) {
        const effectiveMode: IFormUpdate['clearRatesMode'] =
          updateData.clearRates === true ? 'all' : updateData.clearRatesMode ?? undefined;

        // Rate-on-provider postpay: auto-clear only rates and derived totals (keep fee terms)
        if (!effectiveMode && isRateOnProviderPostpayImport && hasPaymentScenarioChanges) {
          updateData.clearRatesMode = 'ratesOnly';
        } else if (!effectiveMode) {
          updateData.clearRates = true;
        }

        // Avoid $set/$unset conflicts in makeUpdate: remove the cleared fields from the payload.
        delete updateData.totals.coverAmount;
        delete updateData.totals.feeAmount;
        delete updateData.totals.feeFixCover;

        delete updateData.currency.rate;
        delete updateData.currency.rateSource;
        delete updateData.currency.fixFeeRate;
        delete updateData.currency.fixFeeRateSource;

        if (updateData.clearRates === true || updateData.clearRatesMode === 'all') {
          delete updateData.totals.feeFix;
          delete updateData.totals.feePercent;
          delete updateData.currency.fixFeeCurrency;
        }
      } else {
        delete updateData.clearRates;
        delete updateData.clearRatesMode;
      }
    }

    const hasAnyPricingPatch =
      hasCurrencyPatch ||
      hasCurrencyRatePatch ||
      hasFeePercentPatch ||
      hasFeeFixPatch ||
      hasTotalsExplicitPatch ||
      updateData.clearRates === true ||
      Boolean(updateData.clearRatesMode);

    if (isPricingAlreadyFixed && !hasAnyPricingPatch) {
      // Pricing already fixed: do not touch monetary fields on status-only transitions
      delete updateData.totals;
      delete updateData.currency;
      delete updateData.clearRates;
      delete updateData.clearRatesMode;
    }

    if (
      updateData.status &&
      formPayment.direction === FormPaymentDirection.IMPORT &&
      formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      RATE_ON_PROVIDER_ADVANCE_STATUSES.has(updateData.status) &&
      nextPlatformPostpayMode !== PlatformPostpayMode.POSTPAY_RATE_ON_PP
    ) {
      throw new BadRequestException('Advance signing order flow is available only for rate-on-provider postpay forms');
    }
    if (!_.isUndefined(updateData.updateProviderOrganization)) {
      if (_.isNull(updateData.updateProviderOrganization)) {
        updateData.providerOrganization = null;
      } else if (updateData.updateProviderOrganization._id !== formPayment.providerOrganization?._id) {
        const providerOrganization = await this.client.send<IOrganization>(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
          query: { _id: updateData.updateProviderOrganization._id, isActive: true },
        });

        updateData.providerOrganization = {
          ..._.omit(providerOrganization, 'requisites'),
          refOrganizationId: providerOrganization._id,
          isChanged: false,
        };

        if (updateData.updateProviderOrganization.requisiteId) {
          const organizationRequisite = _.find(
            providerOrganization.requisites,
            (requisite) => requisite.uuid.toString() === updateData.updateProviderOrganization.requisiteId,
          );

          if (!organizationRequisite) {
            throw new BadRequestException(
              `Organization requisites with id ${updateData.updateProviderOrganization.requisiteId} not found`,
            );
          }

          if (typeof updateData.providerOrganization !== 'string') {
            updateData.providerOrganization.requisite = organizationRequisite;
          }
        }
      }

      delete updateData.updateProviderOrganization;
    }

    if (updateData.status) {
      this.handleOrderFlagsInStatusTransit(formPayment, updateData);
      // Автозавершение сделки для корпоративных клиентов после подтверждения отчета или отправки платежа
      this.applyCorporateAutoComplete(formPayment, updateData);
    }

    // If 1C already sent full COVER coverage before PAYMENT_PROCESSING,
    // то ручной переход менеджером в PAYMENT_PROCESSING должен сразу же привести заявку
    // в PAYMENT_RECEIVED (по аналогии со старым автопереходом по данным 1С).
    if (
      updateData.status === FormPaymentStatus.PAYMENT_PROCESSING &&
      formPayment.direction === FormPaymentDirection.IMPORT &&
      formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      formPayment.platformPostpayMode === PlatformPostpayMode.POSTPAY_FIXED_RATE
    ) {
      const expectedCover = formPayment.totals?.coverAmount ?? formPayment.totals?.amount ?? 0;

      if (expectedCover > 0) {
        try {
          const totalCover = await this.sumCoverPaymentsForForm(String(formPayment._id));

          if (totalCover >= expectedCover) {
            updateData.prevStatus = FormPaymentStatus.PAYMENT_PROCESSING;
            updateData.status = FormPaymentStatus.PAYMENT_RECEIVED;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to auto-close form payment ${formPayment._id} on PAYMENT_PROCESSING: ${message}`);
        }
      }
    }

    let updatedForm = await this.updateOne({ _id: findData._id }, updateData, options);

    const shouldEnsureRateOnProviderFeeTerms =
      updatedForm.status === FormPaymentStatus.FORM_ACCEPTED &&
      this.isRateOnProviderPostpayImportScenario({
        direction: updatedForm.direction,
        platformPaymentCondition: updatedForm.platformPaymentCondition,
        platformPostpayMode: updatedForm.platformPostpayMode,
      }) &&
      (updateData.status === FormPaymentStatus.FORM_ACCEPTED || hasPaymentScenarioChanges);

    if (shouldEnsureRateOnProviderFeeTerms) {
      try {
        updatedForm = await this.ensureRateOnProviderFeeTermsOnAccept({
          formPayment: { ...updatedForm, account: updatedForm.account || formPayment.account },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to set fee terms for form payment ${updatedForm._id} on FORM_ACCEPTED: ${message}`);
      }
    }

    if (updateData.status && formPayment.status !== updateData.status) {
      await this.logFormPaymentStatusChange(ctx, updatedForm._id, updateData.status);
      await this.syncOrganizationStatus(ctx, formPayment, updateData.status);

      // Обновляем виртуальные счета при изменении статуса
      // Убеждаемся, что account загружен для проверки корпоративности клиента
      const formPaymentWithAccount = {
        ...updatedForm,
        account: updatedForm.account || formPayment.account,
      };
      this.virtualAccountUpdateService
        .updateVirtualAccountsOnStatusChange(formPaymentWithAccount, formPayment.status, updateData.status)
        .catch((err) => {
          this.logger.error(
            `Error updating virtual accounts in updateByAdmins for form payment ${updatedForm._id}: ${err.message}`,
          );
        });

      // Обновляем стакан обязательств при изменении статуса
      this.client
        .send(LiquidityPattern.UPDATE_COMMITMENTS_ON_STATUS_CHANGE, {
          payment: updatedForm,
          oldStatus: formPayment.status,
          newStatus: updateData.status,
        })
        .catch((err) => {
          this.logger.error(
            `Error updating commitments in updateByAdmins for form payment ${updatedForm._id}: ${err.message}`,
          );
        });

      // Update counterparty approval status if linked
      if (this.counterpartyHook && updatedForm.counterpartyRef) {
        const accountId = typeof findData.account === 'string' ? findData.account : findData.account?._id?.toString();
        await this.counterpartyHook
          .onFormPaymentStatusChanged(
            updatedForm._id.toString(),
            updatedForm.status,
            updatedForm.counterpartyRef.toString(),
            accountId,
            updateData.rejectText,
          )
          .catch((err) => {
            this.logger.error(`Failed to update counterparty approval: ${err.message}`);
          });
      }

      // Авто-расчёт курса/комиссии при старте работы менеджера (FORM_VERIFICATION)
      if (
        updateData.status === FormPaymentStatus.FORM_VERIFICATION &&
        updatedForm &&
        !this.isPricingFixed(updatedForm) &&
        !(
          updatedForm.direction === FormPaymentDirection.IMPORT &&
          updatedForm.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
          updatedForm.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP
        )
      ) {
        try {
          this.logger.debug(
            `Auto fixing rate for form payment ${updatedForm._id} (status=form_verification, account=${getIdFromAccount(
              updatedForm.account || formPayment.account,
            )})`,
          );
          updatedForm = await this.fixRate(String(updatedForm._id));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to auto fix rate for form payment ${updatedForm._id}: ${message}`);
        }
      }

      // Если статус изменен на FORM_WAITING_VERIFICATION, запускаем анализ контрагента через ChatGPT
      const isStatusChangedToWaitingVerification =
        updateData.status === FormPaymentStatus.FORM_WAITING_VERIFICATION &&
        formPayment.status !== FormPaymentStatus.FORM_WAITING_VERIFICATION;

      if (isStatusChangedToWaitingVerification && formPayment.account) {
        const isChatGptActive = this.configService.get('recognize.chatgpt.isActive');
        if (isChatGptActive) {
          const formPaymentId = String(updatedForm._id);

          this.analyzeCounterpartyWithChatGpt(formPaymentId).catch((err) => {
            this.logger.error(
              `Error while analyzing counterparty via ChatGPT for form payment ${formPaymentId}: ${err.message}`,
              err instanceof Error ? err.stack : undefined,
            );
            // Не пробрасываем ошибку дальше, чтобы не блокировать основной процесс обновления заявки
          });
        }
      }

      // Auto-fix rate/commission on FORM_ACCEPTED
      if (
        updateData.status === FormPaymentStatus.FORM_ACCEPTED &&
        updatedForm &&
        !this.isPricingFixed(updatedForm) &&
        !(
          updatedForm.direction === FormPaymentDirection.IMPORT &&
          updatedForm.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
          updatedForm.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP
        )
      ) {
        try {
          this.logger.debug(
            `Auto fixing rate for form payment ${updatedForm._id} (status=form_accepted, account=${getIdFromAccount(
              updatedForm.account || formPayment.account,
            )})`,
          );
          updatedForm = await this.fixRate(String(updatedForm._id));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to auto fix rate for form payment ${updatedForm._id}: ${message}`);
        }
      }

      // Rate-on-provider postpay: auto-fix rate when provider payment is sent.
      if (
        updateData.status === FormPaymentStatus.PAYMENT_SENT &&
        updatedForm &&
        !this.isPricingFixed(updatedForm) &&
        this.isRateOnProviderPostpayImportScenario({
          direction: updatedForm.direction,
          platformPaymentCondition: updatedForm.platformPaymentCondition,
          platformPostpayMode: updatedForm.platformPostpayMode,
        })
      ) {
        try {
          this.logger.debug(
            `Auto fixing rate for form payment ${updatedForm._id} (status=payment_sent, account=${getIdFromAccount(
              updatedForm.account || formPayment.account,
            )})`,
          );
          updatedForm = await this.fixRate(String(updatedForm._id));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to auto fix rate for form payment ${updatedForm._id}: ${message}`);
        }
      }
    }

    if (updateData.status) {
      this.createEvent({ ...updatedForm, account: formPayment.account }, formPayment.status).catch((err) =>
        this.logger.error(JSON.stringify(err.response?.data || err.message || err)),
      );
      this.createTelegramEvent({ ...updatedForm, account: formPayment.account }, formPayment.status).catch((err) =>
        this.logger.error(JSON.stringify(err.response?.data || err.message || err)),
      );

      if (updateData.status === FormPaymentStatus.COMPLETED) {
        this.compressFiles(formPayment).catch((err) =>
          this.logger.error(JSON.stringify(err.response?.data || err.message || err)),
        );
      }
    }

    if (
      updateData.status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED &&
      formPayment.direction === FormPaymentDirection.EXPORT
    ) {
      await this.updateOne(
        { _id: findData._id },
        {
          prevStatus: FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
          status: FormPaymentStatus.PAYMENT_RECEIVED,
        },
        options,
      );
    }

    if (isPaymentSentRequested) {
      this.client.emit(RecognitionEventPattern.PAYMENT_RECOGNIZE_ONE, updatedForm);
    }

    // // Обновление ликвидности
    // const condition =
    //   (updateData.status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
    //     updatedForm.direction === FormPaymentDirection.IMPORT &&
    //     updatedForm.platformPaymentCondition !== FormPaymentCondition.POST_PAYMENT) ||
    //   (updatedForm.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
    //     updateData.status === FormPaymentStatus.PAYMENT_SENT) ||
    //   (updateData.status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED &&
    //     updatedForm.direction === FormPaymentDirection.EXPORT);
    //
    // if (condition) {
    //   // await this.liquidityQueue.add(LiquidityJobQueuePatterns.ORDER_ACCEPTED, updatedForm);
    // }

    // для импорта
    if (updatedForm.direction === FormPaymentDirection.IMPORT) {
      // берем в учет только если рубли
      if (formPayment.currency.client == AllCurrencies.RUB) {
        const agentDetails = await this.resolveAgentDetails(updatedForm.agent);

        // зачисляем ликвидность при подтверждении получения ДС в рублях
        if (updateData.status === FormPaymentStatus.PAYMENT_RECEIVED && ALLOWED_PREV_STATUSES.has(formPayment.status)) {
          // coverAmount хранится в копейках, в стакане тоже хранится в копейках
          let liquidAmount = updatedForm.totals.coverAmount || 0;

          // для импортных сделок (авансовых и постоплатных) добавляем feeAmount
          const feeAmount = updatedForm.totals.feeAmount || 0;
          liquidAmount = liquidAmount + feeAmount;

          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: liquidAmount,
              direction: FormPaymentDirection.IMPORT,
              currency: AllCurrencies.RUB,
              agentName: agentDetails.agentName,
              agentId: agentDetails.agentId,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.IMPORT}:cur:${AllCurrencies.RUB}:amt:${liquidAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }

        // убираем ликвидность, когда провайдер исполнил сделку (аванс/постоплата)
        // списание только с экспортного стакана (списание с импортного стакана убрано)
        if (isPaymentSentRequested && formPayment.status === FormPaymentStatus.PAYMENT_PROCESSING) {
          const counterPartyCurrency = formPayment.currency.counterparty;
          // totals.amount хранится в копейках, в стакане тоже хранится в копейках
          const secondAmount = (updatedForm.totals.amount || 0) * -1;

          // Получаем информацию о провайдере для export
          const providerDetails = this.extractProviderDetails(updatedForm.providerOrganization);

          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: secondAmount,
              direction: FormPaymentDirection.EXPORT,
              currency: counterPartyCurrency,
              providerName: providerDetails.providerName,
              providerId: providerDetails.providerId,
              accountNumber: providerDetails.accountNumber,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.EXPORT}:cur:${counterPartyCurrency}:amt:${secondAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }

        // // возвращаем обратно последние изменения при возврата платежа от контрагента
        // if (updateData.isPaymentCancel) {
        //   let liquidAmount = formPayment.totals.coverAmount;
        //   await this.liquidityQueue.add(LiquidityJobQueuePatterns.APPLY_LIQUID, {
        //     amount: liquidAmount,
        //     direction: formPayment.direction,
        //     currency: AllCurrencies.RUB,
        //   });
        //
        //   let secondLiquidAmount = formPayment.totals.amount;
        //   let counterPartyCurrency = formPayment.currency.counterparty;
        //
        //   if (counterPartyCurrency !== AllCurrencies.USD) {
        //     const { amount: result } = await this.client.send(CurrencyPattern.CONVERT, {
        //       amount: secondLiquidAmount,
        //       fromSymbol: counterPartyCurrency,
        //       toSymbol: AllCurrencies.USD,
        //       sources: [CurrencySource.OPEN_EXCHANGE],
        //       strategy: RateStrategy.BASE_WEAKER,
        //     });
        //
        //     secondLiquidAmount = Math.round(result) as number;
        //   }
        //
        //   await this.liquidityQueue.add(LiquidityJobQueuePatterns.APPLY_LIQUID, {
        //     amount: secondLiquidAmount,
        //     direction: FormPaymentDirection.EXPORT,
        //     currency: AllCurrencies.USD,
        //   });
        // }
      }

      // списание с импортного стакана при возврате средств клиенту
      if (formPayment.currency.client === AllCurrencies.RUB) {
        if (updateData.status === FormPaymentStatus.PAYMENT_REFUND_SENT) {
          const agentDetails = await this.resolveAgentDetails(updatedForm.agent);
          const liquidAmount = Number((updatedForm.totals.coverAmount * -1).toFixed(2));

          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: liquidAmount,
              direction: FormPaymentDirection.IMPORT,
              currency: AllCurrencies.RUB,
              agentName: agentDetails.agentName,
              agentId: agentDetails.agentId,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.IMPORT}:cur:${AllCurrencies.RUB}:amt:${liquidAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }

        // списание с импортного стакана при отмене авансовой сделки
        if (
          formPayment.platformPaymentCondition === FormPaymentCondition.ADVANCE &&
          (updateData.status === FormPaymentStatus.CANCELED_BY_MANAGER ||
            updateData.status === FormPaymentStatus.CANCELED_BY_USER)
        ) {
          const agentDetails = await this.resolveAgentDetails(updatedForm.agent);
          const liquidAmount = Number((updatedForm.totals.coverAmount * -1).toFixed(2));

          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: liquidAmount,
              direction: FormPaymentDirection.IMPORT,
              currency: AllCurrencies.RUB,
              agentName: agentDetails.agentName,
              agentId: agentDetails.agentId,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.IMPORT}:cur:${AllCurrencies.RUB}:amt:${liquidAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }
      }
    }
    // для экспорта
    if (updatedForm.direction === FormPaymentDirection.EXPORT) {
      // пополнение экспортного стакана при получении платежа от контрагента
      // Исключаем PAYMENT_SENT из проверки, чтобы избежать двойного пополнения
      if (
        updateData.status === FormPaymentStatus.PAYMENT_RECEIVED &&
        ALLOWED_PREV_STATUSES.has(formPayment.status) &&
        formPayment.status !== FormPaymentStatus.PAYMENT_SENT
      ) {
        const counterPartyCurrency = formPayment.currency.counterparty;
        // totals.amount хранится в копейках, в стакане тоже хранится в копейках
        const liquidAmount = updatedForm.totals?.amount || 0;
        if (liquidAmount > 0) {
          // Получаем информацию о провайдере
          const providerDetails = this.extractProviderDetails(updatedForm.providerOrganization);

          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: liquidAmount,
              direction: FormPaymentDirection.EXPORT,
              currency: counterPartyCurrency,
              providerName: providerDetails.providerName,
              providerId: providerDetails.providerId,
              accountNumber: providerDetails.accountNumber,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.EXPORT}:cur:${counterPartyCurrency}:amt:${liquidAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }
      }

      // списание рублей с импортного стакана при переходе в PAYMENT_SENT по экспортной сделке
      // берем в учет только если валюта клиента - рубли
      if (
        updateData.status === FormPaymentStatus.PAYMENT_SENT &&
        formPayment.status !== FormPaymentStatus.PAYMENT_SENT &&
        formPayment.currency.client === AllCurrencies.RUB
      ) {
        const agentDetails = await this.resolveAgentDetails(updatedForm.agent);
        // coverAmount хранится в копейках, в стакане тоже хранится в копейках
        const importLiquidAmount = (updatedForm.totals?.coverAmount || 0) * -1;

        if (importLiquidAmount < 0) {
          await this.liquidityQueue.add(
            LiquidityJobQueuePatterns.APPLY_LIQUID,
            {
              amount: importLiquidAmount,
              direction: FormPaymentDirection.IMPORT,
              currency: AllCurrencies.RUB,
              agentName: agentDetails.agentName,
              agentId: agentDetails.agentId,
            },
            {
              jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.IMPORT}:cur:${AllCurrencies.RUB}:amt:${importLiquidAmount}`,
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 5,
              backoff: { type: 'exponential', delay: 800 },
            },
          );
        }
      }

      // пополнение экспортного стакана при возврате платежа на счет провайдера
      if (updateData.status === FormPaymentStatus.PAYMENT_REFUND_SENT) {
        const counterPartyCurrency = formPayment.currency.counterparty;
        // totals.amount хранится в копейках, в стакане тоже хранится в копейках
        const liquidAmount = updatedForm.totals.amount || 0;

        // Получаем информацию о провайдере
        const providerDetails = this.extractProviderDetails(updatedForm.providerOrganization);

        await this.liquidityQueue.add(
          LiquidityJobQueuePatterns.APPLY_LIQUID,
          {
            amount: liquidAmount,
            direction: FormPaymentDirection.EXPORT,
            currency: counterPartyCurrency,
            providerName: providerDetails.providerName,
            providerId: providerDetails.providerId,
            accountNumber: providerDetails.accountNumber,
          },
          {
            jobId: `liq:apply:form:${updatedForm._id}:status:${updateData.status}:prev:${formPayment.status}:dir:${FormPaymentDirection.EXPORT}:cur:${counterPartyCurrency}:amt:${liquidAmount}`,
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 5,
            backoff: { type: 'exponential', delay: 800 },
          },
        );
      }
    }

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  async applyPaymentFromPaymentService(payload: IApplyPaymentPayload): Promise<void> {
    try {
      const formPaymentModel = await super.findOne({ _id: payload.formPaymentId });
      if (!formPaymentModel) {
        this.logger.warn(`Form ${payload.formPaymentId} not found for payment application`);
        return;
      }

      const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

      if (formPayment.platformPaymentCondition !== FormPaymentCondition.POST_PAYMENT) {
        return;
      }

      const updateData: IFormUpdate = {};

      if (payload.chargeType === PaymentChargeType.COVER) {
        if (!formPayment.dateReceiptOfCover || payload.payDate < new Date(formPayment.dateReceiptOfCover)) {
          updateData.dateReceiptOfCover = payload.payDate;
        }

        const expectedCover = formPayment.totals?.coverAmount ?? formPayment.totals?.amount ?? 0;
        const terminalStatuses: FormPaymentStatus[] = [
          FormPaymentStatus.COMPLETED,
          FormPaymentStatus.CANCELED_BY_MANAGER,
          FormPaymentStatus.CANCELED_BY_USER,
          FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
          FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
        ];
        const isTerminalStatus = terminalStatuses.includes(formPayment.status);
        const isRateOnProviderPostpay = formPayment.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP;
        const canAutoCloseRateOnProvider =
          isRateOnProviderPostpay && RATE_ON_PROVIDER_AUTO_PAYMENT_RECEIVED_STATUSES.has(formPayment.status);

        if (
          expectedCover > 0 &&
          payload.totalAmount >= expectedCover &&
          formPayment.status !== FormPaymentStatus.PAYMENT_RECEIVED &&
          !isTerminalStatus &&
          // Автоматический переход в PAYMENT_RECEIVED:
          // - standard flow: only from PAYMENT_PROCESSING;
          // - для rate-on-provider postpay (postpay_rate_on_pp) также из статусов доп. поручения,
          //   когда покрытие пришло после подписанного advance-поручения.
          (formPayment.status === FormPaymentStatus.PAYMENT_PROCESSING || canAutoCloseRateOnProvider)
        ) {
          updateData.prevStatus = formPayment.status;
          updateData.status = FormPaymentStatus.PAYMENT_RECEIVED;
        }
      } else if (payload.chargeType === PaymentChargeType.FEE) {
        if (!formPayment.dateReceiptOfCommission || payload.payDate < new Date(formPayment.dateReceiptOfCommission)) {
          updateData.dateReceiptOfCommission = payload.payDate;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return;
      }

      await this.updateByAdmins(this.buildSystemPaymentContext(), { _id: payload.formPaymentId }, updateData);
    } catch (error) {
      this.logger.error(
        `Failed to apply payment from PaymentService to form ${payload.formPaymentId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async sumCoverPaymentsForForm(formId: string): Promise<number> {
    if (!Types.ObjectId.isValid(formId)) {
      this.logger.warn(`Skip sumCoverPaymentsForForm: invalid form id ${formId}`);
      return 0;
    }

    const [result] = await this.paymentModel
      .aggregate<{ total: number }>([
        {
          $match: {
            entity: new Types.ObjectId(formId),
            chargeType: PaymentChargeType.COVER,
            status: PaymentStatus.SUCCESS,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paymentAmount' },
          },
        },
      ])
      .exec();

    return result?.total ?? 0;
  }

  private buildSystemPaymentContext(): FeatureContext {
    return new FeatureContext({ accountId: '000000000000000000000000', accountRoles: [AccountRole.ROOT] });
  }

  async compressFiles(formPayment: FormPaymentWithAccountDocsDto) {
    const files = _.reduce(
      formPayment.docs,
      (memo, value, key) => {
        if (_.isArray(value)) {
          memo.push(
            ..._.map(value, (file: IFile) => ({
              _id: file._id,
              originalName: file.originalName,
            })),
          );
        } else {
          if (key !== 'archive') {
            memo.push({
              _id: value._id,
              originalName: value.originalName,
            });
          }
        }

        return memo;
      },
      [],
    );

    const file = await this.client.send(FilePattern.COMPRESS, {
      files,
      uid: formPayment.uid,
    });

    this.updateOne({ _id: formPayment._id }, { docs: { ...formPayment.docs, archive: file._id } });
  }

  async createEvent(form: IFormPayment, oldStatus: FormPaymentStatus) {
    try {
      // const managers = await this.client.send(AccountPattern.FIND_MANY, {
      //   query: {
      //     roles: AccountRole.MANAGER,
      //   },
      //   options: {
      //     select: 'email, -_id',
      //   },
      // });

      // const managerEmails = _.map(managers, 'email');

      let event = eventsHash[form.status];

      if (!event) return;

      _.mapKeys(event, async (value, role: AccountRole) => {
        let eventValue: unknown = _.clone(value);

        if (_.isObject(eventValue)) {
          const eventObj = eventValue as Record<string, unknown>;
          if (eventObj.oldStatus) {
            eventValue = (eventObj.oldStatus as Record<string, unknown>)[oldStatus];
          }

          const eventWithDirection = eventValue as Record<string, unknown>;
          if (eventWithDirection?.import || eventWithDirection?.export) {
            eventValue = eventWithDirection[form.direction];
          }

          // if (eventValue.value && isAdmin === eventValue.isAdmin) {
          //   eventValue = eventValue.value;
          // }

          if (!_.isString(eventValue)) return;
        }

        if (role === AccountRole.USER) {
          await this.client.send(SenderPattern.SEND_USER, {
            type: eventValue,
            account: form.account,
            data: { ...form },
            language: 'ru',
          });

          const organizationId = this.getOrganizationIdFromForm(form.organization);

          if (organizationId) {
            const organization = await this.organizationService.findOne(
              { _id: organizationId, isActive: true },
              { include: ['subaccounts.account', 'account'] },
            );

            if (!organization) {
              return;
            }

            const mainAccountId = typeof form.account === 'string' ? form.account : form.account?._id?.toString();
            const uniqueAccounts = new Map<string, IAccount>();

            // Добавляем создателя организации, если он не является создателем сделки
            if (organization.account) {
              let organizationCreatorAccount: IAccount | undefined;

              if (typeof organization.account === 'string') {
                // Если account - это строка (ID), нужно получить полные данные
                organizationCreatorAccount = await this.client.send<IAccount>(AccountPattern.FIND_ONE, {
                  query: {
                    _id: organization.account,
                  },
                });
              } else {
                organizationCreatorAccount = organization.account;
              }

              if (organizationCreatorAccount) {
                const creatorAccountId = organizationCreatorAccount._id?.toString();
                if (creatorAccountId && creatorAccountId !== mainAccountId) {
                  uniqueAccounts.set(creatorAccountId, organizationCreatorAccount);
                }
              }
            }

            const activeSubaccounts = organization?.subaccounts?.filter(
              (subaccount) => subaccount.status === OrganizationSubaccountStatusType.ACTIVE && subaccount.account,
            );

            if (activeSubaccounts?.length) {
              for (const subaccount of activeSubaccounts) {
                const account = subaccount.account;

                // Пропускаем если аккаунт не заполнен или это строковая ссылка
                if (!account || typeof account === 'string') {
                  continue;
                }

                const accountId = account._id?.toString();

                if (accountId && accountId !== mainAccountId) {
                  uniqueAccounts.set(accountId, account);
                }
              }
            }

            // Отправляем уведомления параллельно для всех участников организации
            if (uniqueAccounts.size > 0) {
              await Promise.all(
                Array.from(uniqueAccounts.values()).map((account) =>
                  this.client.send(SenderPattern.SEND_USER, {
                    type: eventValue,
                    account,
                    data: { ...form },
                    language: account.lang || 'ru',
                  }),
                ),
              );
            }
          }
        }

        // if (role === AccountRole.MANAGER) {
        //   await this.client.send(SenderPattern.SEND_ADMINS, {
        //     type: eventValue,
        //     managerEmails,
        //     data: { ...form },
        //     language: 'ru',
        //   });
        // }
      });
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expiresPaidDateEveryHour() {
    if (!this.configService.get('isDevelopment')) {
      await this.createEventsExpiresPaidDate();
    }
  }

  async createEventsExpiresPaidDate() {
    try {
      const formPayments = await super.findMany(
        {
          direction: FormPaymentDirection.IMPORT,
          statuses: [FormPaymentStatus.PAYMENT_RECEIVED, FormPaymentStatus.PAYMENT_PROCESSING],
          totalsPaidDateLte: moment().add(1, 'day').endOf('day').toDate(),
          totalsIsEventSentExpiresPaidDate: false,
        },
        { include: ['account', 'provider', 'manager'] },
      );

      if (!formPayments.length) return;

      const managers = await this.client.send(AccountPattern.FIND_MANY, {
        query: {
          roles: AccountRole.MANAGER,
        },
        options: {
          select: 'email, -_id',
        },
      });

      const managerEmails = _.map(managers, 'email');

      for (const formPayment of formPayments) {
        /** email **/
        if ((formPayment.provider as IAccount)?.email) {
          managerEmails.push((formPayment.provider as IAccount)?.email);
        }

        await this.client.send(SenderPattern.SEND_ADMINS, {
          type: SenderFormPaymentEvents.EXPIRES_PAID_DATE,
          managerEmails,
          data: { ...formPayment },
          language: 'ru',
        });

        /** telegram **/
        await this.client.send(SenderTelegramPattern.SEND, {
          event: SenderFormPaymentEvents.EXPIRES_PAID_DATE,
          language: 'ru',
          data: { form: formPayment },
        } as ITelegramSend);

        await this.updateOne(
          { _id: formPayment._id },
          { totals: { ...formPayment.totals, isEventSentExpiresPaidDate: true } },
        );
      }
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
    }
  }

  async createTelegramEvent(form: IFormPayment, oldStatus: FormPaymentStatus) {
    try {
      if (form.status === oldStatus) return;

      const event = _.chain(mapEventFormPayment).findKey(_.partial(_.isMatch, form)).value();

      if (!event) return;

      await this.client.send(SenderTelegramPattern.SEND, {
        event,
        language: 'ru',
        data: { form },
      } as ITelegramSend);
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
    }
  }

  private checkTransit({
    startStatus,
    endStatus,
    direction,
    platformPostpayMode,
    isCorporateClient,
  }: checkTransitStatus): boolean {
    let hash;
    if (direction === FormPaymentDirection.IMPORT) {
      hash = _.defaults({}, transitionsImportForm, transitionsExportForm);
    } else {
      hash = _.defaults({}, transitionsExportForm, transitionsImportForm);
    }

    let hashStartStatus = hash[startStatus];

    if (hashStartStatus && hashStartStatus.includes(endStatus)) {
      return true;
    }

    // Импорт по авансу: после PAYMENT_SENT менеджер должен иметь возможность отправить отчет.
    if (
      direction === FormPaymentDirection.IMPORT &&
      !platformPostpayMode &&
      startStatus === FormPaymentStatus.PAYMENT_SENT &&
      endStatus === FormPaymentStatus.REPORT_WAITING
    ) {
      return true;
    }

    // Rate-on-provider postpay (postpay_rate_on_pp) allows extra transitions after PAYMENT_SENT.
    if (direction === FormPaymentDirection.IMPORT && platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP) {
      const allowedTransitions = transitionsImportFormRateOnProviderPostpay[startStatus];
      if (allowedTransitions && allowedTransitions.includes(endStatus)) {
        return true;
      }
    }

    // Для корпоративных клиентов: из SIGNING_ORDER_VERIFICATION_TREASURER можно перейти в COMPLETED
    if (
      isCorporateClient &&
      startStatus === FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER &&
      endStatus === FormPaymentStatus.COMPLETED
    ) {
      return true;
    }

    return false;
  }

  private handleOrderFlagsInStatusTransit(form: IFormPayment, updateData: IFormUpdate) {
    if (!form.isSigningOrderSent && updateData.status === FormPaymentStatus.SIGNING_ORDER) {
      updateData.isSigningOrderSent = true;
    }

    if (form.isOrderAccepted) {
      return;
    }

    if (
      (form.direction === FormPaymentDirection.IMPORT &&
        updateData.status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED) ||
      (form.direction === FormPaymentDirection.EXPORT &&
        updateData.status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED)
    ) {
      updateData.isOrderAccepted = true;
      updateData.orderAcceptanceDate = new Date();
    }
  }

  async updateOneRpc(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    const updatedForm = await this.updateOne(findData, updateData, options);

    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });

    return updatedForm;
  }

  async updateManyRpc(findData: IFormPaymentQuery, updateData: IFormUpdate): Promise<void> {
    await this.updateMany(findData, updateData);

    const updatedForms = await super.findMany(findData);

    for (const form of updatedForms) {
      await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
        action: SocketMessageAction.UPDATE,
        formPayment: form,
      });
    }
  }

  // Обновление субаккаунтов организаций
  async syncOrganizationSubaccountsRpc(data: IFormSyncOrganizationSubaccountsRpc): Promise<void> {
    const { organizationId, subaccounts, account } = data;

    await this.model.updateMany(
      {
        'organization._id': organizationId,
        // status: {
        //   $not: {
        //     $in: [
        //       FormPaymentStatus.CREATING,
        //       FormPaymentStatus.DRAFT,
        //       FormPaymentStatus.CANCELED_BY_USER,
        //       FormPaymentStatus.CANCELED_BY_MANAGER,
        //       FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
        //       FormPaymentStatus.PAYMENT_SENT,
        //     ],
        //   },
        // },
      },
      { 'organization.subaccounts': subaccounts, 'organization.account': account },
    );
  }

  async sendFormPaymentNotifications(updatedForm: IFormPayment, action: SocketMessageAction): Promise<void> {
    try {
      const populatedForm = await super.findOne(
        { _id: updatedForm._id.toString() },
        {
          include: formPaymentPopulate.toInclude(),
        },
      );

      await this.addContractsDataToFormPayment(populatedForm, { include: formPaymentPopulate.toInclude() });

      // Обогащаем файлы treasurerOrder, treasurerOrderSigned и exportRevenueConfirmation
      await this.enrichTreasurerOrderFiles([populatedForm]);

      // Обогащаем таску казначея
      await this.enrichTask([populatedForm]);

      const paymentFormUpdateNotificationData: ISocketMessageData<IFormPayment> = {
        context: SocketMessageContext.FORM_PAYMENT,
        action,
        payload: populatedForm,
      };

      const notifications: ISocketMessage<IFormPayment>[] = [];

      // Для клиента
      notifications.push({
        account: getIdFromAccount(populatedForm.account),
        data: paymentFormUpdateNotificationData,
      });

      const subaccounts = (populatedForm.organization as IFormPaymentOrganization)?.subaccounts;
      if (subaccounts?.length) {
        for (const item of subaccounts) {
          notifications.push({
            account: getIdFromAccount(item.account),
            data: paymentFormUpdateNotificationData,
          });
        }
      }

      // Для провайдера
      if (populatedForm.provider) {
        notifications.push({
          account: getIdFromAccount(populatedForm.provider),
          data: paymentFormUpdateNotificationData,
        });
      }

      const adminAccounts = await this.client.send<Pick<IAccount, '_id'>[]>(AccountPattern.FIND_MANY, {
        query: {
          roles: [
            AccountRole.MANAGER,
            AccountRole.COMPLIANCE_OFFICER,
            AccountRole.ROOT,
            AccountRole.INTERNAL_COMPLIANCE_OFFICER,
          ],
        },
        options: {
          select: '_id',
        },
      });

      // Для админов
      notifications.push(
        ...adminAccounts.map(({ _id }) => ({
          account: _id,
          data: paymentFormUpdateNotificationData,
        })),
      );

      await this.client.emit(SocketEventPattern.SEND_MANY, notifications);

      // При переходе в SIGNING_ORDER_VERIFICATION_TREASURER отправляем сокет казначею через комнату роли
      if (populatedForm.status === FormPaymentStatus.SIGNING_ORDER_VERIFICATION_TREASURER) {
        const treasurerRoomNotification: ISocketMessageData<IFormPayment> = {
          context: SocketMessageContext.FORM_PAYMENT,
          action,
          payload: populatedForm,
          room: `role:${AccountRole.TREASURER}`,
        };

        await this.client.emit(SocketEventPattern.BROADCAST_MANY_AUTHORIZED, [treasurerRoomNotification]);
      }
    } catch (e) {
      this.logger.error(e, e.stack);
    }
  }

  // TODO: подумать над расширением, предавать в rejectCb?: (file: IFile) для проверки других свойств файла
  private async retrieveExistedFiles(fileIds: string[], rejectCb?: (fileId: string) => boolean): Promise<string[]> {
    const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
      _ids: fileIds,
    });

    const existedFileIdsChain = _.chain(files).map('_id');

    if (rejectCb) {
      existedFileIdsChain.reject(rejectCb);
    }

    const existedFileIds = existedFileIdsChain.value();

    return _.intersection(fileIds, existedFileIds);
  }

  private async setAgentByLastContract(form: IFormPayment, updateData: IFormUpdate) {
    const contracts = await this.client.send<IContract[]>(ContractPattern.FIND_MANY, {
      query: {
        account: (form.account as IAccount)._id,
        status: ContractStatus.ACCEPTED,
      },
      options: {
        sort: '-createDate',
      },
    });

    if (contracts.length) {
      if (contracts.length === 1) {
        updateData.agent = contracts[0].agent;
      } else {
        const agents = _.map<IContract>(contracts, 'agent');
        const formPaymentPrev = await super.findOne(
          { account: (form.account as IAccount)._id, agents: agents },
          {
            sort: '-createDate',
          },
        );

        updateData.agent = formPaymentPrev.agent;
      }
    }
  }

  private async validateFormContract(contractId?: string | null, accountId?: string): Promise<void> {
    if (_.isUndefined(contractId) || _.isNull(contractId)) {
      return;
    }

    const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
      _ids: [contractId],
      ...(accountId ? { account: accountId } : {}),
    });

    const existed = files.some((file) => file._id?.toString() === contractId);

    if (!existed) {
      throw new BadRequestException('Contract file not found');
    }
  }

  private async addContractFile(formPayment: IFormPayment): Promise<void> {
    if (!formPayment?.contract || typeof formPayment.contract !== 'string') {
      return;
    }

    const accountId = getIdFromAccount(formPayment.account);
    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: formPayment.contract,
      ...(accountId ? { account: accountId } : {}),
    });

    if (file) {
      formPayment.contract = file;
    }
  }

  private async addContractFileToForms(forms: IFormPayment[]): Promise<void> {
    if (!forms?.length) {
      return;
    }

    await Promise.all(forms.map((form) => this.addContractFile(form)));
  }

  private hydrateContractFromInvoices(formPayment: IFormPayment): void {
    if (formPayment.contract || !formPayment.invoices?.length) {
      return;
    }

    const legacyContract = formPayment.invoices.find((invoice) => this.hasInvoiceContractField(invoice))?.contract;

    if (legacyContract) {
      formPayment.contract = legacyContract;
    }
  }

  private hydrateContractsFromInvoices(forms: IFormPayment[]): void {
    if (!forms?.length) {
      return;
    }

    forms.forEach((form) => this.hydrateContractFromInvoices(form));
  }

  private async checkInvoices(data: IFormPaymentCreate | IFormUpdate, formPayment?: IFormPayment) {
    if (!data.invoices?.length) {
      return data;
    }

    const invoiceHasContract = data.invoices?.some((invoice) => this.hasInvoiceContractField(invoice));
    if (invoiceHasContract) {
      throw new BadRequestException('Contract must be attached to form, not invoice');
    }

    const invoicesIds = _.chain(data.invoices).map('file').compact().value();

    const invoicesFiles = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
      _ids: invoicesIds,
      account: data.account,
    });

    if (invoicesIds.length !== invoicesFiles.length) {
      throw new BadRequestException('File not found');
    }

    const isValidMimeType = _.chain(invoicesFiles)
      .map('mimeType')
      .every((mimeType) => mimeType === 'application/pdf')
      .value();

    if (!isValidMimeType) {
      throw new BadRequestException('Invoice must be pdf');
    }

    if (!formPayment) {
      return data;
    } else {
      if ((formPayment.invoices?.[0]?.file as string) !== data.invoices?.[0]?.file) {
        data.status = FormPaymentStatus.CREATING;
      }
    }
  }

  private async generateSigningOrder(form: IFormPayment, agentId: string): Promise<IFormPayment> {
    const agent = await this.client.send<IAgent>(AgentPattern.FIND_ONE_OR_EXCEPTION, { query: { _id: agentId } });

    const generateOrderData: IGenerateOrder & IIdField = {
      _id: form._id,
      clientOrganization: (form.organization as IFormPaymentOrganization)?.name,
      organizationName: agent.organizationName,
      signer: form.signer,
      isAdvance: false,
      agent: agent._id,
    };

    return this.generateDocsService.generateOrder(generateOrderData);
  }

  async findCursor(
    findData: IFormPaymentQuery,
    options?: IBaseOptions,
  ): Promise<Cursor<IFormPaymentForXlsx, QueryOptions<IFormPayment>>> {
    const filter = await this.makeQuery(findData);
    const sort = options?.sort;

    return this.model.find<IFormPaymentForXlsx>(filter).populate('payments').sort(sort).cursor();
  }

  private updateStageIfNeeded(formPayment: FormPayment, updateData: IFormUpdate): void {
    let stagesHash: StageHash | undefined;

    const direction = updateData.direction || formPayment.direction;
    const platformPaymentCondition = updateData.platformPaymentCondition || formPayment.platformPaymentCondition;

    if (
      direction === FormPaymentDirection.IMPORT &&
      (platformPaymentCondition === FormPaymentCondition.ADVANCE || !platformPaymentCondition)
    ) {
      stagesHash = importAdvanceStagesHash;
    } else if (
      direction === FormPaymentDirection.IMPORT &&
      platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
    ) {
      stagesHash = importPostpayStagesHash;
    } else if (direction === FormPaymentDirection.EXPORT) {
      stagesHash = exportStagesHash;
    }

    if (!stagesHash) {
      return;
    }

    let foundStage: FormPaymentStage | undefined;

    for (const [stage, statuses] of stagesHash) {
      for (const s of statuses) {
        if (typeof s === 'object' && s !== null && 'status' in s && 'prevStatus' in s) {
          if (s.status === updateData.status && s.prevStatus.includes(formPayment.prevStatus)) {
            foundStage = stage;
            break;
          }
        } else if (s === updateData.status) {
          foundStage = stage;
          break;
        }
      }

      if (foundStage) break;
    }

    if (foundStage && foundStage !== formPayment.stage) {
      updateData.stage = foundStage;
    }
  }

  async updateOne(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions) {
    const query = await this.makeQuery(findData);
    // Загружаем форму - Mongoose должен автоматически загрузить все поля, включая linkedExportForms
    const formPayment = await this.model.findOne(query);

    if (formPayment) {
      this.updateStageIfNeeded(formPayment, updateData);
      this.formPaymentCheckCoverBugLogger(formPayment, updateData);
    }

    await this.handleLinkedExportFormsOnUpdate(formPayment, updateData);

    // Сохраняем информацию о том, изменился ли totals.amount
    const totalsAmountChanged =
      formPayment?.direction === FormPaymentDirection.IMPORT &&
      updateData.totals?.amount !== undefined &&
      updateData.totals.amount !== formPayment.totals?.amount;

    // Проверяем, изменились ли поля, влияющие на производные поля в totals
    const feeAmountChanged =
      updateData.totals?.feeAmount !== undefined && updateData.totals.feeAmount !== formPayment?.totals?.feeAmount;
    const currencyRateChanged =
      updateData.currency?.rate !== undefined && updateData.currency.rate !== formPayment?.currency?.rate;

    const updatedForm = await super.updateOne(findData, updateData, options);

    // Если изменился totals.amount для импортной сделки, пересчитываем статус переплаты
    if (totalsAmountChanged && updatedForm) {
      await this.calculateAndSetOverpaymentStatus(updatedForm);
    }

    // Пересчитываем производные поля в totals при изменении соответствующих полей
    // differenceAmount зависит от: totals.amount, feeAmountInCounterpartyCurrency (который зависит от feeAmount и currency.rate), linkedExportFormsTotalAmount
    if (updatedForm && (totalsAmountChanged || feeAmountChanged || currencyRateChanged)) {
      await this.calculateAndUpdateTotalsDerivedFields(updatedForm);
    }

    return updatedForm;
  }

  async updateOneOrException(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions) {
    const query = await this.makeQuery(findData);
    // Загружаем форму - Mongoose должен автоматически загрузить все поля, включая linkedExportForms
    const formPayment = await this.model.findOne(query);

    if (formPayment) {
      this.updateStageIfNeeded(formPayment, updateData);
      this.formPaymentCheckCoverBugLogger(formPayment, updateData);
    }

    await this.handleLinkedExportFormsOnUpdate(formPayment, updateData);

    // Сохраняем информацию о том, изменился ли totals.amount
    const totalsAmountChanged =
      formPayment?.direction === FormPaymentDirection.IMPORT &&
      updateData.totals?.amount !== undefined &&
      updateData.totals.amount !== formPayment.totals?.amount;

    // Проверяем, изменились ли поля, влияющие на производные поля в totals
    const feeAmountChanged =
      updateData.totals?.feeAmount !== undefined && updateData.totals.feeAmount !== formPayment?.totals?.feeAmount;
    const currencyRateChanged =
      updateData.currency?.rate !== undefined && updateData.currency.rate !== formPayment?.currency?.rate;

    const updatedForm = await super.updateOneOrException(findData, updateData, options);

    // Если изменился totals.amount для импортной сделки, пересчитываем статус переплаты
    if (totalsAmountChanged && updatedForm) {
      await this.calculateAndSetOverpaymentStatus(updatedForm);
    }

    // Пересчитываем производные поля в totals при изменении соответствующих полей
    // differenceAmount зависит от: totals.amount, feeAmountInCounterpartyCurrency (который зависит от feeAmount и currency.rate), linkedExportFormsTotalAmount
    if (updatedForm && (totalsAmountChanged || feeAmountChanged || currencyRateChanged)) {
      await this.calculateAndUpdateTotalsDerivedFields(updatedForm);
    }

    return updatedForm;
  }

  /**
   * Обработка привязанных экспортных сделок при обновлении импортной сделки
   */
  private async handleLinkedExportFormsOnUpdate(
    formPayment: FormPayment | null,
    updateData: IFormUpdate,
  ): Promise<void> {
    // Проверяем, что форма импортная
    if (!formPayment || formPayment.direction !== FormPaymentDirection.IMPORT) {
      return;
    }

    // Устанавливаем isFreeze: true для привязанных экспортных сделок
    if (updateData.linkedExportForms?.length) {
      await this.model.updateMany({ _id: { $in: updateData.linkedExportForms } }, { $set: { isFreeze: true } });
    }

    // Нормализуем старые привязки к строкам для корректного сравнения
    // linkedExportForms может содержать: строки, ObjectId или полные объекты IFormPayment
    // ВАЖНО: Mongoose может возвращать ObjectId как объекты, которые при логировании выглядят как строки
    const normalizeFormId = (f: unknown): string | null => {
      // Если это строка (примитивный тип) - возвращаем как есть
      if (typeof f === 'string') {
        return f;
      }

      // Если это ObjectId - конвертируем в строку
      if (f instanceof Types.ObjectId) {
        return f.toString();
      }

      // Если это объект, который может быть ObjectId или String объектом
      if (f && typeof f === 'object') {
        // Проверяем, есть ли метод toString и можем ли мы его вызвать
        if ('toString' in f && typeof (f as any).toString === 'function') {
          try {
            const stringValue = (f as any).toString();
            // Проверяем, что результат похож на ObjectId (24 символа hex)
            if (typeof stringValue === 'string' && /^[0-9a-fA-F]{24}$/.test(stringValue)) {
              return stringValue;
            }
          } catch (error) {
            // Игнорируем ошибки
          }
        }

        // Если это объект с _id - извлекаем ID
        if ('_id' in f) {
          const id = (f as { _id?: string | Types.ObjectId | { toString(): string } })._id;
          if (id != null) {
            // Универсальное преобразование ID в строку
            return id instanceof Types.ObjectId ? id.toString() : String(id);
          }
        }
      }

      // Последняя попытка - просто конвертировать в строку
      try {
        const stringValue = String(f);
        // Проверяем, что результат похож на ObjectId (24 символа hex)
        if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
          return stringValue;
        }
      } catch (error) {
        // Игнорируем ошибки
      }

      return null;
    };

    const exportFormIds = (formPayment.linkedExportForms || [])
      .map(normalizeFormId)
      .filter((id): id is string => id !== null);

    const currentStatus = updateData.status || formPayment.status;
    const isFormPaymentCompleted = currentStatus === FormPaymentStatus.SIGNING_ORDER_ACCEPTED;

    // Определяем актуальные привязки (новые, если были изменены, иначе старые)
    // Нормализуем новые привязки так же, как старые, чтобы обработать все возможные форматы
    const actualLinkedExportFormIds = !_.isUndefined(updateData.linkedExportForms)
      ? (updateData.linkedExportForms || []).map(normalizeFormId).filter((id): id is string => id !== null)
      : exportFormIds;

    // Пересчитываем и сохраняем сумму привязанных экспортных сделок
    // Важно: вызываем всегда, даже если linkedExportForms не изменялся, чтобы пересчитать сумму
    await this.calculateAndSaveLinkedExportFormsTotalAmount(formPayment, actualLinkedExportFormIds);

    // Если привязки были изменены и импортная сделка еще не проведена, снимаем isFreeze с отвязанных экспортных сделок
    if (!_.isUndefined(updateData.linkedExportForms) && !isFormPaymentCompleted) {
      // Оба массива уже нормализованы к строкам, можно сравнивать напрямую
      const unlinkedExportFormIds = exportFormIds.filter((id) => !actualLinkedExportFormIds.includes(id));

      if (unlinkedExportFormIds.length > 0) {
        await this.model.updateMany({ _id: { $in: unlinkedExportFormIds } }, { $set: { isFreeze: false } });
      }
    }

    // При переходе импортной сделки в SIGNING_ORDER_ACCEPTED ставим isAvailable: false привязанным экспортным
    if (updateData.status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED) {
      await this.model.updateMany({ _id: { $in: actualLinkedExportFormIds } }, { $set: { isAvailable: false } });
      // Вычитаем средства из экспортного стакана для привязанных экспортных сделок
      await this.subtractFromExportLiquidityForLinkedForms(actualLinkedExportFormIds);
    }

    // При переходе импортной сделки в PAYMENT_SENT_TREASURER проверяем превышение суммы экспортных сделок над импортной и создаем задачу казначея
    if (updateData.status === FormPaymentStatus.PAYMENT_SENT_TREASURER) {
      if (actualLinkedExportFormIds.length > 0) {
        // Загружаем форму с полными данными для создания задачи казначея
        const formPaymentWithFullData = await this.model
          .findById(formPayment._id)
          .populate(formPaymentPopulate.toInclude());
        if (formPaymentWithFullData) {
          await this.createTreasurerTaskIfExportExceedsImport(formPaymentWithFullData, actualLinkedExportFormIds);
        }
      }
    }

    // При отмене импортной сделки снимаем isFreeze с привязанных экспортных сделок
    // Используем актуальные привязки (новые, если были изменены, иначе старые)
    if (updateData.status && formPaymentCancellationStatuses.includes(updateData.status)) {
      await this.model.updateMany({ _id: { $in: actualLinkedExportFormIds } }, { $set: { isFreeze: false } });
    }
  }

  /**
   * Валидирует валюту контрагента
   * @param currency - валюта для валидации
   * @returns true если валюта валидна, false в противном случае
   */
  private isValidCounterpartyCurrency(currency: string | undefined): currency is AllCurrencies {
    return !!currency && Object.values(AllCurrencies).includes(currency as AllCurrencies);
  }

  /**
   * Получает и валидирует валюту контрагента импортной сделки
   * @param importForm - импортная сделка
   * @returns валюта контрагента или null если валюта невалидна
   */
  private getValidatedImportCounterpartyCurrency(importForm: IFormPayment | FormPayment): AllCurrencies | null {
    const currency = importForm.currency?.counterparty;
    if (!this.isValidCounterpartyCurrency(currency)) {
      this.logger.warn({
        message: 'Import form missing counterparty currency',
        importFormId: importForm._id,
        currency,
      });
      return null;
    }
    return currency;
  }

  /**
   * Получает экспортные сделки с сохранением порядка из массива ID
   * @param exportFormIds - массив ID экспортных сделок в нужном порядке (строки)
   * @returns массив экспортных сделок в том же порядке
   */
  private async getExportFormsInOrder(exportFormIds: string[]): Promise<FormPayment[]> {
    if (!exportFormIds.length) {
      return [];
    }

    // Нормализуем все ID к ObjectId для запроса к БД
    // exportFormIds уже является массивом строк, конвертируем их в ObjectId
    const objectIds = exportFormIds
      .map((id) => {
        try {
          // id уже строка, просто создаем ObjectId
          return new Types.ObjectId(id);
        } catch (error) {
          this.logger.warn({
            message: 'Invalid export form ID format, skipping',
            exportFormId: id,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => id !== null);

    if (!objectIds.length) {
      this.logger.warn({
        message: 'No valid export form IDs after normalization',
        originalIds: exportFormIds,
      });
      return [];
    }

    const exportFormsRaw = await this.model.find({ _id: { $in: objectIds } });

    if (!exportFormsRaw.length) {
      this.logger.warn({
        message: 'No export forms found in database',
        requestedIds: exportFormIds,
        normalizedIds: objectIds.map((id) => id.toString()),
      });
      return [];
    }

    // Сохраняем порядок из exportFormIds
    // Нормализуем ID форм к строкам для сравнения
    const exportFormsMap = new Map(exportFormsRaw.map((form) => [form._id.toString(), form]));
    const exportForms = exportFormIds
      .map((id) => {
        // id уже строка, используем как есть
        return exportFormsMap.get(String(id));
      })
      .filter((form): form is FormPayment => form !== undefined);

    if (exportForms.length !== exportFormIds.length) {
      const foundIds = exportForms.map((f) => f._id.toString());
      const notFoundIds = exportFormIds.filter((id) => {
        // id уже строка, используем как есть
        return !foundIds.includes(String(id));
      });
      this.logger.warn({
        message: 'Some export forms were not found',
        requestedIds: exportFormIds,
        foundIds,
        notFoundIds,
      });
    }

    return exportForms;
  }

  /**
   * Конвертирует сумму из одной валюты в другую
   * @param amount - сумма для конвертации (в копейках)
   * @param fromCurrency - исходная валюта
   * @param toCurrency - целевая валюта
   * @param context - контекст для логирования (formId, formType и т.д.)
   * @returns конвертированная сумма или null в случае ошибки
   */
  private async convertCurrencyAmount(
    amount: number,
    fromCurrency: AllCurrencies,
    toCurrency: AllCurrencies,
    context?: { formId?: string; formType?: string },
  ): Promise<number | null> {
    // Если валюты совпадают, возвращаем исходную сумму
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      const { amount: convertedAmount } = await this.client.send(CurrencyPattern.CONVERT, {
        amount,
        fromSymbol: fromCurrency,
        toSymbol: toCurrency,
        sources: [CurrencySource.OPEN_EXCHANGE, CurrencySource.CBR],
        strategy: RateStrategy.BASE_WEAKER,
      });
      return convertedAmount;
    } catch (error) {
      this.logger.error({
        message: 'Failed to convert currency',
        fromCurrency,
        toCurrency,
        amount,
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Валидирует и получает сумму экспортной сделки
   * @param exportForm - экспортная сделка
   * @returns сумма в валюте контрагента или null если данные невалидны
   */
  private getValidatedExportFormAmount(exportForm: FormPayment): number | null {
    const amount = exportForm.totals?.amount || 0;
    if (amount <= 0) {
      this.logger.warn({
        message: 'Export form has invalid or zero amount',
        exportFormId: exportForm._id,
        amount,
      });
      return null;
    }
    return amount;
  }

  /**
   * Конвертирует сумму формы в целевую валюту
   * @param form - форма платежа
   * @param targetCurrency - целевая валюта
   * @returns конвертированная сумма в единицах (не копейки) или undefined в случае ошибки
   */
  async convertFormAmountToCurrency(form: IFormPayment, targetCurrency: AllCurrencies): Promise<number | undefined> {
    if (!form.totals?.amount || !form.currency?.counterparty) {
      return undefined;
    }

    const counterpartyCurrency = form.currency.counterparty;
    const amount = form.totals.amount; // amount в копейках

    // Валидация: проверяем, что валюта контрагента валидна
    if (!this.isValidCounterpartyCurrency(counterpartyCurrency)) {
      this.logger.warn(`Invalid counterparty currency for form ${form._id}: ${counterpartyCurrency}`);
      return undefined;
    }

    // Если валюта контрагента совпадает с целевой, просто делим на 100
    if (counterpartyCurrency === targetCurrency) {
      return amount / 100;
    }

    // Конвертируем из валюты контрагента в целевую валюту
    const convertedAmount = await this.convertCurrencyAmount(amount, counterpartyCurrency, targetCurrency, {
      formId: form._id.toString(),
      formType: 'form',
    });

    if (convertedAmount === null) {
      return undefined;
    }

    // Результат конвертации в тех же единицах (копейки), делим на 100
    return convertedAmount / 100;
  }

  /**
   * Сравнивает суммы импортной сделки и привязанных экспортных сделок и устанавливает статус переплаты
   * Учитывает feeAmountInCounterpartyCurrency при сравнении
   * @param importForm - импортная сделка
   */
  private async calculateAndSetOverpaymentStatus(importForm: IFormPayment | FormPayment): Promise<void> {
    try {
      // Проверяем, что форма импортная
      if (importForm.direction !== FormPaymentDirection.IMPORT) {
        return;
      }

      const linkedExportFormsTotalAmount = importForm.linkedExportFormsTotalAmount || 0;
      const importAmount = importForm.totals?.amount || 0;

      // Вычисляем feeAmountInCounterpartyCurrency для учета в сравнении
      const feeAmount = importForm.totals?.feeAmount;
      const currencyRate = importForm.currency?.rate;
      const counterpartyCurrency = importForm.currency?.counterparty;

      let feeAmountInCounterpartyCurrency = 0;
      if (feeAmount && currencyRate && currencyRate > 0 && counterpartyCurrency) {
        // feeAmount хранится в копейках в рублях
        // currency.rate - прямой курс (например, 1 USD = 80.722 RUB)
        // Для конвертации из рублей в валюту контрагента: feeAmount / rate
        feeAmountInCounterpartyCurrency = Math.round(feeAmount / currencyRate);
      }

      // Сумма импортной сделки с учетом комиссии в валюте контрагента
      const importAmountWithFee = importAmount + feeAmountInCounterpartyCurrency;

      // Если обе суммы равны нулю или отсутствуют, не устанавливаем статус
      if (linkedExportFormsTotalAmount === 0 && importAmountWithFee === 0) {
        await this.model.updateOne({ _id: importForm._id }, { $unset: { overpaymentStatus: '' } });
        return;
      }

      // Статус переплаты устанавливается только для paymentMethod = PAY_FROM_EXPORT
      if (importForm.paymentMethod !== FormPaymentPaymentMethod.PAY_FROM_EXPORT) {
        await this.model.updateOne({ _id: importForm._id }, { $unset: { overpaymentStatus: '' } });
        return;
      }

      let overpaymentStatus: FormPaymentStatus | null = null;

      if (importAmountWithFee === linkedExportFormsTotalAmount) {
        // Суммы равны
        overpaymentStatus = FormPaymentStatus.EQUAL;
      } else if (linkedExportFormsTotalAmount > importAmountWithFee) {
        // Сумма экспортных больше импортной (с учетом комиссии)
        overpaymentStatus = FormPaymentStatus.OVERPAYMENT_EXPORT;
      } else if (importAmountWithFee > linkedExportFormsTotalAmount) {
        // Сумма импортной (с учетом комиссии) больше суммы экспортных
        overpaymentStatus = FormPaymentStatus.OVERPAYMENT_IMPORT;
      }

      if (overpaymentStatus) {
        await this.model.updateOne({ _id: importForm._id }, { $set: { overpaymentStatus } });

        this.logger.log({
          message: 'Calculated and set overpayment status',
          importFormId: importForm._id,
          overpaymentStatus,
          linkedExportFormsTotalAmount,
          importAmount,
          feeAmountInCounterpartyCurrency,
          importAmountWithFee,
          paymentMethod: importForm.paymentMethod,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to calculate and set overpayment status',
        importFormId: importForm._id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Пересчитывает и сохраняет производные поля в totals:
   * - differenceAmount: разница между totals.amount + feeAmountInCounterpartyCurrency и linkedExportFormsTotalAmount (для импортных сделок)
   * - feeAmountInCounterpartyCurrency: feeAmount пересчитанный в валюту контрагента по currency.rate
   * @param formPayment - форма платежа
   */
  private async calculateAndUpdateTotalsDerivedFields(formPayment: IFormPayment | FormPayment): Promise<void> {
    try {
      const updateData: { differenceAmount?: number; feeAmountInCounterpartyCurrency?: number } = {};

      // Вычисляем feeAmountInCounterpartyCurrency сначала, так как он используется в расчете differenceAmount
      const feeAmount = formPayment.totals?.feeAmount;
      const currencyRate = formPayment.currency?.rate;
      const counterpartyCurrency = formPayment.currency?.counterparty;

      let feeAmountInCounterpartyCurrency: number | undefined;
      if (feeAmount && currencyRate && currencyRate > 0 && counterpartyCurrency) {
        // feeAmount хранится в копейках в рублях
        // currency.rate - прямой курс (например, 1 USD = 80.722 RUB)
        // Для конвертации из рублей в валюту контрагента: feeAmount / rate
        feeAmountInCounterpartyCurrency = Math.round(feeAmount / currencyRate);
        updateData.feeAmountInCounterpartyCurrency = feeAmountInCounterpartyCurrency;
      } else {
        // Если нет feeAmount или rate, обнуляем поле
        updateData.feeAmountInCounterpartyCurrency = undefined;
        feeAmountInCounterpartyCurrency = 0;
      }

      // Вычисляем differenceAmount для импортных сделок
      // Формула: differenceAmount = totals.amount + feeAmountInCounterpartyCurrency - linkedExportFormsTotalAmount
      let differenceAmount: number | undefined;
      if (formPayment.direction === FormPaymentDirection.IMPORT) {
        const importAmount = formPayment.totals?.amount || 0;
        const linkedExportFormsTotalAmount = formPayment.linkedExportFormsTotalAmount || 0;
        const feeAmountInCounterparty = feeAmountInCounterpartyCurrency || 0;
        differenceAmount = Math.round(importAmount + feeAmountInCounterparty - linkedExportFormsTotalAmount);
        updateData.differenceAmount = differenceAmount;
      } else {
        // Для экспортных сделок обнуляем поле
        updateData.differenceAmount = undefined;
        differenceAmount = undefined;
      }

      // Обновляем поля в totals
      const setUpdate: Record<string, number> = {};
      const unsetUpdate: Record<string, ''> = {};

      // Вычисляем differenceAmountClientCur только для импортных сделок с paymentMethod = PAY_FROM_EXPORT
      // Если differenceAmount <= 0, то differenceAmountClientCur = 0
      // Если differenceAmount > 0, то differenceAmountClientCur = differenceAmount * currency.rate (конвертация в валюту клиента)
      if (
        formPayment.direction === FormPaymentDirection.IMPORT &&
        formPayment.paymentMethod === FormPaymentPaymentMethod.PAY_FROM_EXPORT
      ) {
        if (differenceAmount !== undefined) {
          if (differenceAmount <= 0) {
            setUpdate['totals.differenceAmountClientCur'] = 0;
          } else if (currencyRate && currencyRate > 0) {
            // Конвертируем differenceAmount из валюты контрагента в валюту клиента
            // currency.rate - это frontendRate (client per 1 counterparty)
            const differenceAmountClientCur = Math.round(differenceAmount * currencyRate);
            setUpdate['totals.differenceAmountClientCur'] = differenceAmountClientCur;
          }
        }
      } else {
        // Для экспортных сделок и импортных сделок с другими paymentMethod обнуляем поле
        unsetUpdate['totals.differenceAmountClientCur'] = '';
      }

      if (updateData.differenceAmount !== undefined) {
        setUpdate['totals.differenceAmount'] = updateData.differenceAmount;
      } else {
        unsetUpdate['totals.differenceAmount'] = '';
      }

      if (updateData.feeAmountInCounterpartyCurrency !== undefined) {
        setUpdate['totals.feeAmountInCounterpartyCurrency'] = updateData.feeAmountInCounterpartyCurrency;
      } else {
        unsetUpdate['totals.feeAmountInCounterpartyCurrency'] = '';
      }

      const updateQuery: {
        $set?: Record<string, number>;
        $unset?: Record<string, ''>;
      } = {};

      if (Object.keys(setUpdate).length > 0) {
        updateQuery.$set = setUpdate;
      }
      if (Object.keys(unsetUpdate).length > 0) {
        updateQuery.$unset = unsetUpdate;
      }

      if (Object.keys(updateQuery).length > 0) {
        await this.model.updateOne({ _id: formPayment._id }, updateQuery);
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to calculate and update totals derived fields',
        formPaymentId: formPayment._id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Подсчитывает и сохраняет сумму привязанных экспортных сделок в валюте контрагента импортной сделки
   * Если валюта контрагента в экспортных сделках отличается, суммы конвертируются в валюту импортной сделки
   */
  private async calculateAndSaveLinkedExportFormsTotalAmount(
    importForm: IFormPayment,
    exportFormIds: string[],
  ): Promise<void> {
    try {
      if (!exportFormIds.length) {
        // Если нет привязанных экспортных сделок, обнуляем сумму
        await this.model.updateOne({ _id: importForm._id }, { $set: { linkedExportFormsTotalAmount: 0 } });
        // Обновляем статус переплаты после обнуления суммы
        const updatedImportForm = await this.model.findById(importForm._id);
        if (updatedImportForm) {
          await this.calculateAndSetOverpaymentStatus(updatedImportForm);
          // Пересчитываем производные поля в totals
          await this.calculateAndUpdateTotalsDerivedFields(updatedImportForm);
        }
        return;
      }

      // Получаем экспортные сделки в порядке привязки
      const exportForms = await this.getExportFormsInOrder(exportFormIds);

      if (!exportForms.length) {
        this.logger.warn({
          message: 'No export forms found, setting total amount to 0',
          importFormId: importForm._id,
          exportFormIds,
        });
        await this.model.updateOne({ _id: importForm._id }, { $set: { linkedExportFormsTotalAmount: 0 } });
        // Обновляем статус переплаты после обнуления суммы
        const updatedImportForm = await this.model.findById(importForm._id);
        if (updatedImportForm) {
          await this.calculateAndSetOverpaymentStatus(updatedImportForm);
          // Пересчитываем производные поля в totals
          await this.calculateAndUpdateTotalsDerivedFields(updatedImportForm);
        }
        return;
      }

      // Получаем валюту контрагента импортной сделки
      const importCounterpartyCurrency = this.getValidatedImportCounterpartyCurrency(importForm);
      if (!importCounterpartyCurrency) {
        // Обнуляем сумму, если валюта контрагента отсутствует
        this.logger.warn({
          message: 'Import form missing counterparty currency, setting total amount to 0',
          importFormId: importForm._id,
          currency: importForm.currency?.counterparty,
        });
        await this.model.updateOne({ _id: importForm._id }, { $set: { linkedExportFormsTotalAmount: 0 } });
        return;
      }

      let totalAmount = 0;

      // Суммируем суммы экспортных сделок с конвертацией в валюту контрагента импортной сделки
      for (const exportForm of exportForms) {
        const exportCounterpartyCurrency = exportForm.currency?.counterparty;
        if (!this.isValidCounterpartyCurrency(exportCounterpartyCurrency)) {
          this.logger.warn({
            message: 'Export form missing counterparty currency, skipping from total calculation',
            exportFormId: exportForm._id,
            currency: exportCounterpartyCurrency,
          });
          continue;
        }

        // Сумма экспортной сделки в валюте контрагента
        const exportAmountRaw = this.getValidatedExportFormAmount(exportForm);
        if (exportAmountRaw === null) {
          continue;
        }

        // Конвертируем в валюту импортной сделки, если необходимо
        const exportAmount = await this.convertCurrencyAmount(
          exportAmountRaw,
          exportCounterpartyCurrency,
          importCounterpartyCurrency,
          { formId: exportForm._id.toString(), formType: 'export' },
        );

        if (exportAmount === null) {
          continue;
        }

        totalAmount += exportAmount;
      }

      // Сохраняем сумму в импортной сделке
      await this.model.updateOne({ _id: importForm._id }, { $set: { linkedExportFormsTotalAmount: totalAmount } });

      this.logger.log({
        message: 'Calculated and saved linked export forms total amount',
        importFormId: importForm._id,
        totalAmount,
        currency: importCounterpartyCurrency,
        exportFormIds,
      });

      // Обновляем импортную сделку из БД для корректного сравнения сумм
      const updatedImportForm = await this.model.findById(importForm._id);
      if (updatedImportForm) {
        // Сравниваем суммы и устанавливаем статус переплаты
        await this.calculateAndSetOverpaymentStatus(updatedImportForm);
        // Пересчитываем производные поля в totals (differenceAmount зависит от linkedExportFormsTotalAmount)
        await this.calculateAndUpdateTotalsDerivedFields(updatedImportForm);
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to calculate linked export forms total amount',
        importFormId: importForm._id,
        error: error.message,
      });
    }
  }

  /**
   * Создает задачу казначея на выплату если сумма экспортных сделок превышает сумму импортной
   * Списание происходит последовательно по экспортным сделкам
   * Остаток записывается в debtAmount экспортной сделки (в валюте контрагента импортной сделки)
   * Сравнение происходит в валюте контрагента импортной сделки
   * Если валюта контрагента в экспортных сделках отличается, суммы конвертируются в валюту импортной сделки
   */
  private async createTreasurerTaskIfExportExceedsImport(
    importForm: FormPayment,
    exportFormIds: string[],
  ): Promise<void> {
    try {
      // Получаем экспортные сделки в порядке привязки
      const exportForms = await this.getExportFormsInOrder(exportFormIds);

      if (!exportForms.length) {
        this.logger.warn({
          message: 'No valid export forms found after filtering',
          importFormId: importForm._id,
          exportFormIds,
        });
        return;
      }

      // Получаем валюту контрагента импортной сделки
      const importCounterpartyCurrency = this.getValidatedImportCounterpartyCurrency(importForm);
      if (!importCounterpartyCurrency) {
        this.logger.warn({
          message: 'Import form missing counterparty currency',
          importFormId: importForm._id,
          currency: importForm.currency?.counterparty,
        });
        return;
      }

      // Сумма импортной сделки в валюте контрагента
      const importAmount = importForm.totals?.amount || 0;
      if (importAmount <= 0) {
        this.logger.warn({
          message: 'Import form has invalid or zero amount',
          importFormId: importForm._id,
          amount: importAmount,
        });
        return;
      }
      let remainingImportAmount = importAmount;

      const clientId = typeof importForm.account === 'string' ? importForm.account : importForm.account?._id;
      let totalDebtAmount = 0;
      const exportFormsWithDebt: { form: FormPayment; debtAmount: number }[] = [];

      // Списываем суммы экспортных сделок по порядку
      for (const exportForm of exportForms) {
        const exportCounterpartyCurrency = exportForm.currency?.counterparty;
        if (!this.isValidCounterpartyCurrency(exportCounterpartyCurrency)) {
          this.logger.warn({
            message: 'Export form missing counterparty currency',
            exportFormId: exportForm._id,
            currency: exportCounterpartyCurrency,
          });
          continue;
        }

        // Сумма экспортной сделки в валюте контрагента
        const exportAmountRaw = this.getValidatedExportFormAmount(exportForm);
        if (exportAmountRaw === null) {
          continue;
        }

        // Конвертируем в валюту импортной сделки, если необходимо
        const exportAmount = await this.convertCurrencyAmount(
          exportAmountRaw,
          exportCounterpartyCurrency,
          importCounterpartyCurrency,
          { formId: exportForm._id.toString(), formType: 'export' },
        );

        if (exportAmount === null) {
          continue;
        }

        if (remainingImportAmount >= exportAmount) {
          // Полностью списываем экспортную сделку
          remainingImportAmount -= exportAmount;
        } else {
          // Частичное списание - остаток нужно вернуть
          // debtAmount хранится в валюте контрагента импортной сделки
          const debtAmount = Math.round(exportAmount - remainingImportAmount);
          remainingImportAmount = 0;

          totalDebtAmount += debtAmount;
          exportFormsWithDebt.push({
            form: exportForm,
            debtAmount,
          });
        }
      }

      // Если есть долг - создаем одну задачу казначея и записываем debtAmount в сделки
      if (totalDebtAmount > 0) {
        // Записываем debtAmount в экспортные сделки (в валюте контрагента импортной сделки)
        for (const { form, debtAmount } of exportFormsWithDebt) {
          await this.model.updateOne({ _id: form._id }, { $set: { debtAmount } });
        }

        // Берем данные последней экспортной сделки с долгом для задачи
        const lastExportWithDebt = exportFormsWithDebt[exportFormsWithDebt.length - 1];

        // Используем курс из импортной сделки
        // currency.rate - прямой курс (например, 1 USD = 80.722 RUB)
        // Если курс не указан, используем 1 (для случая, когда валюта контрагента = валюта клиента)
        const exchangeRate = importForm.currency?.rate || 1;

        // Вычисляем сумму в рублях: для конвертации из валюты контрагента в рубли: refundAmount * exchangeRate
        // Если валюта контрагента = RUB или курс = 1, то refundAmountInRubles = refundAmount
        const refundAmountInRubles =
          importCounterpartyCurrency === AllCurrencies.RUB || exchangeRate === 1
            ? totalDebtAmount
            : Math.round(totalDebtAmount * exchangeRate);

        const treasurerTask = await this.treasurerTaskService.create({
          type: TreasurerTaskType.REFUND_PAYMENT,
          status: TreasurerTaskStatus.CREATED,
          clientId: clientId,
          exportPaymentId: lastExportWithDebt.form._id.toString(),
          importPaymentId: importForm._id.toString(),
          refundAmount: totalDebtAmount,
          refundCurrency: importCounterpartyCurrency,
          refundAmountInRubles: refundAmountInRubles,
          exchangeRate: exchangeRate,
          paymentByProviderDate: lastExportWithDebt.form.paymentByProviderDate || new Date(),
        });

        // Записываем ID задачи в импортную сделку
        await this.model.updateOne({ _id: importForm._id }, { $set: { task: treasurerTask._id.toString() } });
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to create treasurer task',
        importFormId: importForm._id,
        error: error.message,
      });
    }
  }

  /**
   * Вычитает средства из экспортного стакана для привязанных экспортных сделок
   * Используется когда импортная сделка переходит в статус SIGNING_ORDER_ACCEPTED
   */
  private async subtractFromExportLiquidityForLinkedForms(exportFormIds: string[]): Promise<void> {
    try {
      if (!exportFormIds.length) {
        return;
      }

      // Получаем экспортные сделки
      const exportForms = await this.model.find({ _id: { $in: exportFormIds } });

      if (!exportForms.length) {
        return;
      }

      // Для каждой экспортной сделки вычитаем средства из экспортного стакана
      for (const exportForm of exportForms) {
        const amount = exportForm.totals?.amount;
        const currency = exportForm.currency?.counterparty;

        // Проверяем наличие необходимых данных
        if (!amount || !this.isValidCounterpartyCurrency(currency)) {
          this.logger.warn({
            message: 'Skipping export form - missing amount or currency',
            exportFormId: exportForm._id,
            amount,
            currency,
          });
          continue;
        }

        // Получаем информацию о провайдере используя универсальный метод
        const providerDetails = this.extractProviderDetails(exportForm.providerOrganization);

        // Вычитаем отрицательное значение из экспортного стакана
        const liquidAmount = Number((amount * -1).toFixed(2));

        await this.liquidityQueue.add(
          LiquidityJobQueuePatterns.APPLY_LIQUID,
          {
            amount: liquidAmount,
            direction: FormPaymentDirection.EXPORT,
            currency: currency,
            providerName: providerDetails.providerName,
            providerId: providerDetails.providerId,
            accountNumber: providerDetails.accountNumber,
          },
          {
            jobId: `liq:subtract:export:form:${exportForm._id}:cur:${currency}:amt:${liquidAmount}`,
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 5,
            backoff: { type: 'exponential', delay: 800 },
          },
        );

        this.logger.log({
          message: 'Subtracted from export liquidity for linked form',
          exportFormId: exportForm._id,
          currency,
          amount: liquidAmount,
          providerName: providerDetails.providerName,
          providerId: providerDetails.providerId,
          accountNumber: providerDetails.accountNumber,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to subtract from export liquidity for linked forms',
        exportFormIds,
        error: error.message,
      });
    }
  }

  async updateMany(findData: IFormPaymentQuery, updateData: IFormUpdate) {
    const formPayments = await this.model.find(await this.makeQuery(findData));

    for (const formPayment of formPayments) {
      this.updateStageIfNeeded(formPayment, updateData);
      this.formPaymentCheckCoverBugLogger(formPayment, updateData);
    }

    return super.updateMany(findData, updateData);
  }

  private formPaymentCheckCoverBugLogger(formPayment: FormPayment, updateData: IFormUpdate) {
    this.logger.log({
      name: 'formPaymentAmountLog',
      _id: formPayment._id,
      currentAmount: formPayment.totals?.amount,
      updateAmount: updateData.totals?.amount,
      status: formPayment.status,
      prevStatus: formPayment.prevStatus,
      updateStatus: updateData.status,
      updateStage: updateData.stage,
      prevStage: formPayment.stage,
    });
  }

  protected makeUpdate({
    amount,
    currencyClient,
    clientCryptoRequisites,
    currencyCounterparty,
    counterpartyCryptoRequisites,
    addPayments,
    removePayments,
    addClosing,
    removeClosing,
    addRefundDocuments,
    removeRefundDocuments,
    paymentOrder,
    paymentOrderDocx,
    paymentAdvanceOrder,
    paymentAdvanceOrderDocx,
    paymentOrderSigned,
    treasurerOrder,
    treasurerOrderSigned,
    exportRevenueConfirmation,
    organization,
    report,
    docxFile,
    reportSigned,
    addAdditional,
    removeAdditional,
    providerOrganization,
    addSwift,
    removeSwift,
    organizationStatus,
    organizationPhone,
    organizationEmail,
    organizationSignerName,
    organizationSignerPosition,
    organizationInn,
    organizationOgrn,
    organizationKpp,
    organizationLegalAddress,
    organizationFullName,
    organizationName,
    clientOrganization,
    organizationBusinessForm,
    contract,
    rejectText,
    totalsCoverAmount,
    totalsFeeAmount,
    currencyRate,
    clearRates,
    clearRatesMode,
    paymentByProviderDate,
    feePaid,
    sourceFormId,
    copyDate,
    complianceReport,
    linkedExportForms,
    ...data
  }: IFormUpdate) {
    const updateData: UpdateQuery<FormPayment> = {
      $set: { ...data },
      $addToSet: {},
      $unset: {},
      $pull: {},
    };

    if (_.isNumber(amount)) {
      updateData.$set['totals.amount'] = amount;
    }

    if (_.isBoolean(feePaid)) {
      updateData.$set['totals.feePaid'] = feePaid;
    }

    if (currencyClient) {
      updateData.$set['currency.client'] = currencyClient;
    }

    // Обработка полей для функционала копирования заявок
    if (sourceFormId) {
      updateData.$set['sourceFormId'] = sourceFormId;
    }

    if (copyDate) {
      updateData.$set['copyDate'] = copyDate;
    }

    // Обрабатываем обновление complianceReport - используем точечную нотацию для частичного обновления
    if (complianceReport !== undefined) {
      if (complianceReport.text !== undefined) {
        updateData.$set['complianceReport.text'] = complianceReport.text;
      }
      if (complianceReport.status !== undefined) {
        updateData.$set['complianceReport.status'] = complianceReport.status;
      }
      if (complianceReport.error !== undefined) {
        updateData.$set['complianceReport.error'] = complianceReport.error;
      }
      if (complianceReport.createdDate !== undefined) {
        updateData.$set['complianceReport.createdDate'] = complianceReport.createdDate;
      }
      if (complianceReport.requestCount !== undefined) {
        updateData.$set['complianceReport.requestCount'] = complianceReport.requestCount;
      }
      // updatedDate всегда обновляется при любом изменении complianceReport
      if (complianceReport.updatedDate !== undefined) {
        updateData.$set['complianceReport.updatedDate'] = complianceReport.updatedDate;
      } else if (
        complianceReport.text !== undefined ||
        complianceReport.status !== undefined ||
        complianceReport.error !== undefined ||
        complianceReport.requestCount !== undefined
      ) {
        updateData.$set['complianceReport.updatedDate'] = new Date();
      }
    }

    if (!_.isUndefined(contract)) {
      if (_.isNull(contract)) {
        updateData.$unset['contract'] = '';
      } else {
        updateData.$set['contract'] = contract;
      }
    }

    if (!_.isUndefined(clientCryptoRequisites)) {
      if (_.isNull(clientCryptoRequisites)) {
        updateData.$unset['currency.clientCryptoRequisites'] = '';
      } else {
        updateData.$set['currency.clientCryptoRequisites.chain'] = clientCryptoRequisites.chain;
        updateData.$set['currency.clientCryptoRequisites.address'] = clientCryptoRequisites.address;
      }
    }

    if (currencyCounterparty) {
      updateData.$set['currency.counterparty'] = currencyCounterparty;
    }

    if (!_.isUndefined(counterpartyCryptoRequisites)) {
      if (_.isNull(counterpartyCryptoRequisites)) {
        updateData.$unset['currency.counterpartyCryptoRequisites'] = '';
      } else {
        updateData.$set['currency.counterpartyCryptoRequisites.chain'] = counterpartyCryptoRequisites.chain;
        updateData.$set['currency.counterpartyCryptoRequisites.address'] = counterpartyCryptoRequisites.address;
      }
    }

    if (!_.isUndefined(paymentOrder)) {
      // Очищаем поручение принципала если null
      if (_.isNull(paymentOrder)) {
        updateData.$unset['docs.paymentOrder'] = '';
      } else {
        if (!data.signingOrderCreateDate) {
          throw new BadRequestException('Не указана дата поручения принципала');
        }

        updateData.$set['docs.paymentOrder'] = paymentOrder;

        // удаляем paymentOrderDocx если передан только paymentOrder
        if (!paymentOrderDocx) {
          updateData.$unset['docs.paymentOrderDocx'] = '';
        }
      }
    }

    if (!_.isUndefined(paymentOrderDocx)) {
      if (_.isNull(paymentOrderDocx)) {
        updateData.$unset['docs.paymentOrderDocx'] = '';
      } else {
        updateData.$set['docs.paymentOrderDocx'] = paymentOrderDocx;
      }
    }

    if (paymentAdvanceOrder) {
      if (!data.advanceSigningOrderCreateDate) {
        throw new BadRequestException('Не указана дата дополнительного поручения принципала');
      }

      updateData.$set['docs.paymentAdvanceOrder'] = paymentAdvanceOrder;

      // удаляем paymentAdvanceOrderDocx если передан только paymentAdvanceOrder
      if (!paymentAdvanceOrderDocx) {
        updateData.$unset['docs.paymentAdvanceOrderDocx'] = '';
      }
    }

    if (paymentAdvanceOrderDocx) {
      updateData.$set['docs.paymentAdvanceOrderDocx'] = paymentAdvanceOrderDocx;
    }

    if (report) {
      updateData.$set['docs.report'] = report;
    }

    if (docxFile) {
      updateData.$set['docs.docxFile'] = docxFile;
    }

    if (reportSigned) {
      updateData.$set['docs.reportSigned'] = reportSigned;
    }

    if (reportSigned) {
      updateData.$set['docs.reportSigned'] = reportSigned;
    }

    if (paymentOrderSigned) {
      updateData.$set['docs.paymentOrderSigned'] = paymentOrderSigned;
    }

    if (!_.isUndefined(treasurerOrder)) {
      if (_.isNull(treasurerOrder)) {
        updateData.$unset['docs.treasurerOrder'] = '';
      } else {
        updateData.$set['docs.treasurerOrder'] = treasurerOrder;
      }
    }

    if (!_.isUndefined(treasurerOrderSigned)) {
      if (_.isNull(treasurerOrderSigned)) {
        updateData.$unset['docs.treasurerOrderSigned'] = '';
      } else {
        updateData.$set['docs.treasurerOrderSigned'] = treasurerOrderSigned;
      }
    }

    if (!_.isUndefined(exportRevenueConfirmation)) {
      if (_.isNull(exportRevenueConfirmation)) {
        updateData.$unset['docs.exportRevenueConfirmation'] = '';
      } else {
        updateData.$set['docs.exportRevenueConfirmation'] = exportRevenueConfirmation;
      }
    }

    if (addPayments?.length) {
      updateData.$addToSet['docs.payments'] = { $each: addPayments };
    }

    if (addClosing?.length) {
      updateData.$addToSet['docs.closing'] = { $each: addClosing };
    }

    if (addRefundDocuments?.length) {
      updateData.$addToSet['docs.refund'] = { $each: addRefundDocuments };
    }

    if (addAdditional?.length) {
      updateData.$addToSet['docs.additional'] = addAdditional;
    }

    if (addSwift?.length) {
      updateData.$addToSet['docs.swift'] = addSwift;
    }

    if (removePayments?.length) {
      updateData.$pull['docs.payments'] = { $in: removePayments };
    }

    if (removeClosing?.length) {
      updateData.$pull['docs.closing'] = { $in: removeClosing };
    }

    if (removeAdditional?.length) {
      updateData.$pull['docs.additional'] = { $in: removeAdditional };
    }

    if (removeRefundDocuments?.length) {
      updateData.$pull['docs.refund'] = { $in: removeRefundDocuments };
    }

    if (removeSwift?.length) {
      updateData.$pull['docs.swift'] = { $in: removeSwift };
    }

    // Обработка привязки экспортных сделок
    if (linkedExportForms !== undefined) {
      updateData.$set['linkedExportForms'] = linkedExportForms;
    }

    // изменение данных организации клиента в заявке менеджером
    if (organization && _.isObject(organization)) {
      _.forEach(_.toPairs(organization), ([field, value]) => {
        updateData.$set[`organization.${field}`] = value;
      });
    }

    if (_.isNull(providerOrganization)) {
      updateData.$unset.providerOrganization = '';
    } else if (providerOrganization) {
      updateData.$set.providerOrganization = providerOrganization;
    }

    if (organizationStatus) {
      updateData.$set['organization.status'] = organizationStatus;

      // Автоматически устанавливаем approvedAt при апруве организации
      if (organizationStatus === OrganizationStatus.APPROVED) {
        updateData.$set['organization.approvedAt'] = new Date();
      }
    }

    if (organizationPhone) {
      updateData.$set['organization.phone'] = organizationPhone;
    }

    if (organizationEmail) {
      updateData.$set['organization.email'] = organizationEmail;
    }

    if (organizationSignerName) {
      updateData.$set['organization.signerName'] = organizationSignerName;
    }

    if (organizationSignerPosition) {
      updateData.$set['organization.signerPosition'] = organizationSignerPosition;
    }

    if (organizationInn) {
      updateData.$set['organization.inn'] = organizationInn;
    }

    if (organizationOgrn) {
      updateData.$set['organization.ogrn'] = organizationOgrn;
    }

    if (organizationKpp) {
      updateData.$set['organization.kpp'] = organizationKpp;
    }

    if (organizationLegalAddress) {
      updateData.$set['organization.legalAddress'] = organizationLegalAddress;
    }

    if (organizationFullName) {
      updateData.$set['organization.fullName'] = organizationFullName;
    }

    if (clientOrganization) {
      updateData.$set['organization.name'] = clientOrganization;
    }

    if (organizationName) {
      updateData.$set['organizationName'] = organizationName;
    }

    if (organizationBusinessForm) {
      updateData.$set['organization.businessForm'] = organizationBusinessForm;
    }

    if (!_.isUndefined(rejectText)) {
      if (_.isNull(rejectText)) {
        updateData.$unset['rejectText'] = '';
      } else {
        updateData.$set['rejectText'] = rejectText;
      }
    }

    if (!_.isUndefined(totalsCoverAmount)) {
      if (_.isNull(totalsCoverAmount)) {
        updateData.$unset['totals.coverAmount'] = '';
      } else {
        updateData.$set['totals.coverAmount'] = totalsCoverAmount;
      }
    }

    if (!_.isUndefined(totalsFeeAmount)) {
      if (_.isNull(totalsFeeAmount)) {
        updateData.$unset['totals.feeAmount'] = '';
      } else {
        updateData.$set['totals.feeAmount'] = totalsFeeAmount;
      }
    }

    if (!_.isUndefined(currencyRate)) {
      if (_.isNull(currencyRate)) {
        updateData.$unset['currency.rate'] = '';
      } else {
        updateData.$set['currency.rate'] = currencyRate;
      }
    }

    if (!_.isUndefined(paymentByProviderDate)) {
      if (_.isNull(paymentByProviderDate)) {
        updateData.$unset.paymentByProviderDate = '';
      } else {
        updateData.$set.paymentByProviderDate = paymentByProviderDate;
      }
    }

    const effectiveClearRatesMode: IFormUpdate['clearRatesMode'] =
      clearRates === true ? 'all' : clearRatesMode ?? undefined;

    if (effectiveClearRatesMode) {
      updateData.$unset.pricingMode = '';
      updateData.$unset.pricingFixedAt = '';

      updateData.$unset['totals.coverAmount'] = '';
      updateData.$unset['totals.feeAmount'] = '';
      updateData.$unset['totals.feeFixCover'] = '';

      updateData.$unset['currency.rate'] = '';
      updateData.$unset['currency.rateSource'] = '';
      updateData.$unset['currency.fixFeeRate'] = '';
      updateData.$unset['currency.fixFeeRateSource'] = '';

      if (effectiveClearRatesMode === 'all') {
        updateData.$unset['totals.feePercent'] = '';
        updateData.$unset['totals.feeFix'] = '';
        updateData.$unset['currency.fixFeeCurrency'] = '';
      }
    }

    return super.flattenUpdateSet(updateData) as UpdateQuery<FormPayment>;
  }

  private async addContractsDataToFormPayment(
    formPayment: IFormPayment,
    options?: IBaseOptions,
  ): Promise<IFormPayment> {
    if (formPayment.organization && formPayment.agent && options?.include?.includes('agent')) {
      const contract = await this.client.send<IContract>(ContractPattern.FIND_ONE, {
        query: {
          organization: (formPayment.organization as IOrganization)._id,
          agent: (formPayment.agent as IAgent)._id,
        },
        options: {
          include: ['file'],
          sort: '-createDate',
        },
      });

      if (contract) {
        (formPayment.agent as IAgent).contract = contract;
      }

      const contractTemplate = await this.client.send<IContract>(ContractPattern.FIND_ONE, {
        query: {
          isTemplate: true,
        },
        options: {
          include: ['file'],
          sort: '-createDate',
        },
      });

      if (contractTemplate) {
        (formPayment.agent as IAgent).contractTemplate = contractTemplate;
      }

      const rejectedContracts = await this.client.send<IContract[]>(ContractPattern.FIND_MANY, {
        query: {
          account: (formPayment.account as IAccount)._id,
          agent: (formPayment.agent as IAgent)._id,
          status: ContractStatus.REJECTED,
        },
        options: {
          include: ['file'],
          sort: '-createDate',
        },
      });

      formPayment.rejectedAgentContracts = rejectedContracts || [];
    }

    return formPayment;
  }

  private async enrichCounterpartyFromRegistryMany(forms: IFormPayment[]): Promise<void> {
    if (!this.counterpartyService) {
      return;
    }

    if (!forms.length) {
      return;
    }

    // Отбираем формы с counterpartyRef (для обогащения или добавления lastApprovalStatus)
    const formsToEnrich = forms.filter((form) => form.counterpartyRef);

    if (!formsToEnrich.length) {
      return;
    }

    const refs = Array.from(new Set(formsToEnrich.map((f) => f.counterpartyRef!.toString())));

    let counterparties: ICounterparty[];
    try {
      counterparties = await this.counterpartyService.findBasicByIds(refs);
    } catch (error) {
      this.logger.error(`Failed to load counterparties for enrichment: ${error.message}`);
      return;
    }

    if (!counterparties.length) {
      return;
    }

    const map = new Map<string, ICounterparty>();
    for (const cp of counterparties) {
      map.set(cp._id.toString(), cp);
    }

    for (const form of formsToEnrich) {
      const ref = form.counterpartyRef?.toString();
      if (!ref) continue;

      const counterparty = map.get(ref);
      if (!counterparty) {
        this.logger.warn(`Counterparty not found for ref ${ref} (form ${form._id})`);
        continue;
      }

      this.applyCounterpartyFromRegistry(form, counterparty);
    }
  }

  /**
   * Приватный метод для обогащения данных контрагента из реестра, включая неактивных.
   * Обогащает только если данные контрагента еще не заполнены.
   * @param formPayment - Форма платежа для обогащения
   * @param context - Контекст использования для логирования
   */
  private async enrichCounterpartyFromRegistryIncludingInactive(
    formPayment: IFormPayment,
    context: CounterpartyEnrichmentContext = CounterpartyEnrichmentContext.ORDER,
  ): Promise<void> {
    if (!this.counterpartyService) {
      return;
    }

    if (!formPayment.counterpartyRef) {
      return;
    }

    // Проверяем, нужно ли обогащение (аналогично enrichCounterpartyFromRegistryMany)
    const existing: Partial<IFormBankDetails> = formPayment.counterparty || {};
    const hasExisting = Object.keys(existing).length > 0;
    if (hasExisting) {
      // Данные контрагента уже заполнены, не нужно обогащать
      return;
    }

    let counterparties: ICounterparty[];
    try {
      counterparties = await this.counterpartyService.findBasicByIdsIncludingInactive([
        formPayment.counterpartyRef.toString(),
      ]);
    } catch (error) {
      let contextMessage = 'manager API';
      if (context === CounterpartyEnrichmentContext.ORDER) {
        contextMessage = 'order generation';
      } else if (context === CounterpartyEnrichmentContext.SITE) {
        contextMessage = 'site API';
      }
      this.logger.error(`Failed to load counterparty for ${contextMessage}: ${error.message}`);
      return;
    }

    if (!counterparties.length) {
      this.logger.warn(`Counterparty not found for ref ${formPayment.counterpartyRef} (form ${formPayment._id})`);
      return;
    }

    const counterparty = counterparties[0];
    this.applyCounterpartyFromRegistry(formPayment, counterparty);
  }

  /**
   * Обогащает данные контрагента из реестра для одной формы платежа, включая неактивных.
   * Используется при генерации поручений.
   * @param formPayment - Форма платежа для обогащения
   */
  async enrichCounterpartyFromRegistryForOrder(formPayment: IFormPayment): Promise<void> {
    return this.enrichCounterpartyFromRegistryIncludingInactive(formPayment, CounterpartyEnrichmentContext.ORDER);
  }

  /**
   * Обогащает данные контрагента из реестра для одной формы платежа, включая неактивных.
   * Используется в API менеджера для получения полных данных контрагента.
   * @param formPayment - Форма платежа для обогащения
   */
  async enrichCounterpartyFromRegistryForManager(formPayment: IFormPayment): Promise<void> {
    return this.enrichCounterpartyFromRegistryIncludingInactive(formPayment, CounterpartyEnrichmentContext.MANAGER);
  }

  /**
   * Обогащает данные контрагента из реестра для одной формы платежа, включая неактивных.
   * Используется в site API для получения полных данных контрагента.
   * @param formPayment - Форма платежа для обогащения
   */
  async enrichCounterpartyFromRegistryForSite(formPayment: IFormPayment): Promise<void> {
    return this.enrichCounterpartyFromRegistryIncludingInactive(formPayment, CounterpartyEnrichmentContext.SITE);
  }

  private applyCounterpartyFromRegistry(formPayment: IFormPayment, counterparty: ICounterparty): void {
    const existingCounterparty = (formPayment.counterparty || {}) as Partial<IFormBankDetails>;
    const enriched: Partial<IFormBankDetails> = { ...existingCounterparty };

    // Level 1: counterparty-level data
    if (!enriched.name && counterparty.name) {
      enriched.name = counterparty.name;
    }

    if (!enriched.country && counterparty.country) {
      enriched.country = counterparty.country;
    }

    if (!enriched.legalAddress && counterparty.legalAddress) {
      enriched.legalAddress = counterparty.legalAddress;
    }

    if (!enriched.address && (counterparty.legalAddress || existingCounterparty.address)) {
      enriched.address = counterparty.legalAddress || existingCounterparty.address;
    }

    // Добавляем статус одобрения контрагента из реестра (всегда обновляем, если есть в реестре)
    if (counterparty.lastApprovalStatus !== undefined) {
      enriched.lastApprovalStatus = counterparty.lastApprovalStatus;
    }

    // Level 2: bank-level data (optional)
    const { counterpartyBankUuid, counterpartyAccountUuid } = formPayment;

    let bank;
    if (counterpartyBankUuid && Array.isArray(counterparty.banks)) {
      bank = counterparty.banks.find((b) => b.uuid === counterpartyBankUuid);
      if (!bank) {
        this.logger.warn(
          `Bank not found for uuid ${counterpartyBankUuid} in counterparty ${counterparty._id} (form ${formPayment._id})`,
        );
      }
    }

    if (bank) {
      if (!enriched.bankName && bank.bankName) {
        enriched.bankName = bank.bankName;
      }
      if (!enriched.bankCountry && bank.bankCountry) {
        enriched.bankCountry = bank.bankCountry;
      }
      if (!enriched.bankAddress && bank.bankAddress) {
        enriched.bankAddress = bank.bankAddress;
      }
      if (!enriched.swiftCode && bank.swiftCode) {
        enriched.swiftCode = bank.swiftCode;
      }
    }

    // Level 3: account-level data (optional)
    if (bank && counterpartyAccountUuid && Array.isArray(bank.accounts)) {
      const account = bank.accounts.find((a) => a.uuid === counterpartyAccountUuid);

      if (!account) {
        this.logger.warn(
          `Account not found for uuid ${counterpartyAccountUuid} in bank ${counterpartyBankUuid} (form ${formPayment._id})`,
        );
      } else if (!enriched.accountNumber && account.accountNumber) {
        enriched.accountNumber = account.accountNumber;
      }
    }

    if (Object.keys(enriched).length) {
      formPayment.counterparty = { ...(formPayment.counterparty || {}), ...enriched };
    }
  }

  /**
   * Обогащает linkedExportForms полными данными после toPlain()
   * Работает аналогично enrichCounterpartyFromRegistryMany
   */
  private async enrichLinkedExportForms(forms: IFormPayment[]): Promise<void> {
    if (!forms.length) {
      return;
    }

    // Отбираем формы с linkedExportForms, которые содержат только ID
    const formsToEnrich = forms.filter((form) => {
      if (!form.linkedExportForms || !Array.isArray(form.linkedExportForms)) {
        return false;
      }
      // Проверяем, есть ли хотя бы один элемент, который является ID (строкой или ObjectId)
      return form.linkedExportForms.some((formId) => typeof formId === 'string' || formId instanceof Types.ObjectId);
    });

    if (!formsToEnrich.length) {
      return;
    }

    // Собираем все ID из linkedExportForms
    const formIds = new Set<string>();
    for (const form of formsToEnrich) {
      if (form.linkedExportForms && Array.isArray(form.linkedExportForms)) {
        for (const formId of form.linkedExportForms) {
          if (typeof formId === 'string') {
            formIds.add(formId);
          } else if (formId instanceof Types.ObjectId) {
            formIds.add(formId.toString());
          }
        }
      }
    }

    if (!formIds.size) {
      return;
    }

    // Загружаем полные данные форм платежей напрямую через модель, чтобы избежать рекурсии
    const query = await this.makeQuery({ _ids: Array.from(formIds) });
    const populatePaths = formPaymentPopulate.toInclude();
    const models = await this.model.find(query).populate(populatePaths).exec();

    if (!models.length) {
      return;
    }

    // Преобразуем модели в plain объекты
    const linkedForms: IFormPayment[] = [];
    for (const model of models) {
      const plainForm = await this.toPlain(model, { include: populatePaths });
      // Обрабатываем только базовые поля, без рекурсивного обогащения linkedExportForms
      this.stripAccountRateHistory(plainForm);
      this.hydrateContractFromInvoices(plainForm);
      await this.addContractFile(plainForm);
      await this.enrichCounterpartyFromRegistryMany([plainForm]);
      // НЕ вызываем enrichLinkedExportForms здесь, чтобы избежать рекурсии
      linkedForms.push(plainForm);
    }

    // Создаем мапу для быстрого доступа
    const formsMap = new Map<string, IFormPayment>();
    for (const form of linkedForms) {
      formsMap.set(form._id.toString(), form);
    }

    // Заменяем ID на полные объекты
    for (const form of formsToEnrich) {
      if (form.linkedExportForms && Array.isArray(form.linkedExportForms)) {
        form.linkedExportForms = form.linkedExportForms.map((formId) => {
          // Обрабатываем строки
          if (typeof formId === 'string') {
            const fullForm = formsMap.get(formId);
            return fullForm || formId;
          }
          // Обрабатываем ObjectId
          if (formId instanceof Types.ObjectId) {
            const idString = formId.toString();
            const fullForm = formsMap.get(idString);
            return fullForm || idString;
          }
          // Если уже объект, оставляем как есть
          return formId;
        });
      }
    }
  }

  /**
   * Обогащает task полными данными после toPlain()
   * Работает аналогично enrichCounterpartyFromRegistryMany
   */
  private async enrichTask(forms: IFormPayment[]): Promise<void> {
    if (!forms.length) {
      return;
    }

    // Отбираем формы с task, которые содержат только ID (строку или ObjectId)
    const formsToEnrich = forms.filter((form) => {
      return form.task && (typeof form.task === 'string' || form.task instanceof Types.ObjectId);
    });

    if (!formsToEnrich.length) {
      return;
    }

    // Собираем уникальные ID задач
    const taskIds = Array.from(
      new Set(
        formsToEnrich
          .map((form) => {
            if (typeof form.task === 'string') {
              return form.task;
            }
            if (form.task instanceof Types.ObjectId) {
              return form.task.toString();
            }
            return null;
          })
          .filter(Boolean) as string[],
      ),
    );

    if (!taskIds.length) {
      return;
    }

    // Загружаем полные данные задач казначея с populate файлов
    let tasks: ITreasurerTask[];
    try {
      tasks = await this.treasurerTaskService.findMany(
        { _ids: taskIds },
        { include: ['treasurerOrder', 'treasurerOrderSigned', 'exportRevenueConfirmation'] },
      );
    } catch (error) {
      this.logger.error(`Failed to load treasurer tasks for enrichment: ${error.message}`);
      return;
    }

    if (!tasks.length) {
      return;
    }

    // Создаем мапу для быстрого доступа
    const tasksMap = new Map<string, ITreasurerTask>();
    for (const task of tasks) {
      tasksMap.set(task._id.toString(), task);
    }

    // Заменяем ID на полные объекты
    for (const form of formsToEnrich) {
      const taskId =
        typeof form.task === 'string' ? form.task : form.task instanceof Types.ObjectId ? form.task.toString() : null;

      if (!taskId) continue;

      const fullTask = tasksMap.get(taskId);
      if (fullTask) {
        form.task = fullTask;
      } else {
        this.logger.warn(`Treasurer task not found for id ${taskId} (form ${form._id})`);
      }
    }
  }

  /**
   * Обогащает docs.treasurerOrder, docs.treasurerOrderSigned и docs.exportRevenueConfirmation полными данными после toPlain()
   * Работает аналогично enrichTask
   */
  private async enrichTreasurerOrderFiles(forms: IFormPayment[]): Promise<void> {
    if (!forms.length) {
      return;
    }

    // Собираем уникальные ID файлов для обогащения
    const fileIds = new Set<string>();

    for (const form of forms) {
      if (form.docs?.treasurerOrder) {
        const fileId =
          typeof form.docs.treasurerOrder === 'string'
            ? form.docs.treasurerOrder
            : form.docs.treasurerOrder instanceof Types.ObjectId
            ? form.docs.treasurerOrder.toString()
            : null;
        if (fileId) {
          fileIds.add(fileId);
        }
      }

      if (form.docs?.treasurerOrderSigned) {
        const fileId =
          typeof form.docs.treasurerOrderSigned === 'string'
            ? form.docs.treasurerOrderSigned
            : form.docs.treasurerOrderSigned instanceof Types.ObjectId
            ? form.docs.treasurerOrderSigned.toString()
            : null;
        if (fileId) {
          fileIds.add(fileId);
        }
      }

      if (form.docs?.exportRevenueConfirmation) {
        const fileId =
          typeof form.docs.exportRevenueConfirmation === 'string'
            ? form.docs.exportRevenueConfirmation
            : form.docs.exportRevenueConfirmation instanceof Types.ObjectId
            ? form.docs.exportRevenueConfirmation.toString()
            : null;
        if (fileId) {
          fileIds.add(fileId);
        }
      }
    }

    if (!fileIds.size) {
      return;
    }

    // Загружаем полные данные файлов
    let files: IFile[];
    try {
      files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: Array.from(fileIds),
      });
    } catch (error) {
      this.logger.error(`Failed to load treasurer order files for enrichment: ${error.message}`);
      return;
    }

    if (!files.length) {
      return;
    }

    // Создаем мапу для быстрого доступа
    const filesMap = new Map<string, IFile>();
    for (const file of files) {
      filesMap.set(file._id.toString(), file);
    }

    // Заменяем ID на полные объекты
    for (const form of forms) {
      if (form.docs?.treasurerOrder) {
        const fileId =
          typeof form.docs.treasurerOrder === 'string'
            ? form.docs.treasurerOrder
            : form.docs.treasurerOrder instanceof Types.ObjectId
            ? form.docs.treasurerOrder.toString()
            : null;

        if (fileId) {
          const fullFile = filesMap.get(fileId);
          if (fullFile) {
            form.docs.treasurerOrder = fullFile;
          } else {
            this.logger.warn(`Treasurer order file not found for id ${fileId} (form ${form._id})`);
          }
        }
      }

      if (form.docs?.treasurerOrderSigned) {
        const fileId =
          typeof form.docs.treasurerOrderSigned === 'string'
            ? form.docs.treasurerOrderSigned
            : form.docs.treasurerOrderSigned instanceof Types.ObjectId
            ? form.docs.treasurerOrderSigned.toString()
            : null;

        if (fileId) {
          const fullFile = filesMap.get(fileId);
          if (fullFile) {
            form.docs.treasurerOrderSigned = fullFile;
          } else {
            this.logger.warn(`Treasurer order signed file not found for id ${fileId} (form ${form._id})`);
          }
        }
      }

      if (form.docs?.exportRevenueConfirmation) {
        const fileId =
          typeof form.docs.exportRevenueConfirmation === 'string'
            ? form.docs.exportRevenueConfirmation
            : form.docs.exportRevenueConfirmation instanceof Types.ObjectId
            ? form.docs.exportRevenueConfirmation.toString()
            : null;

        if (fileId) {
          const fullFile = filesMap.get(fileId);
          if (fullFile) {
            form.docs.exportRevenueConfirmation = fullFile;
          } else {
            this.logger.warn(`Export revenue confirmation file not found for id ${fileId} (form ${form._id})`);
          }
        }
      }
    }
  }

  /**
   * Type guard для проверки наличия MongoDB оператора ($or или $and) в объекте
   */
  private hasMongoOperator(
    obj: unknown,
    operator: '$or' | '$and',
  ): obj is Record<string, unknown> & { [K in typeof operator]: unknown } {
    return typeof obj === 'object' && obj !== null && operator in obj;
  }

  private getMongoOperator(
    obj: unknown,
    operator: '$or' | '$and',
  ): FilterQuery<FormPayment>[typeof operator] | undefined {
    if (!this.hasMongoOperator(obj, operator)) {
      return undefined;
    }
    const value = obj[operator];
    if (Array.isArray(value)) {
      return value as FilterQuery<FormPayment>[typeof operator];
    }
    return undefined;
  }

  private mergeOrCondition(query: FilterQuery<FormPayment>, newOrCondition: FilterQuery<FormPayment>[]): void {
    // Если $or есть на верхнем уровне, перемещаем его в $and вместе с новым условием
    if (query.$or) {
      const existingOrConditions = query.$or;
      delete query.$or;
      if (!query.$and) {
        query.$and = [];
      }
      query.$and.push({ $or: existingOrConditions });
      query.$and.push({ $or: newOrCondition });
    } else if (query.$and) {
      // Если $or уже перемещен в $and, просто добавляем новое условие в $and
      query.$and.push({ $or: newOrCondition });
    } else {
      // Если нет ни $or, ни $and, создаем простое $or
      query.$or = newOrCondition;
    }
  }

  private addToOrCondition(query: FilterQuery<FormPayment>, condition: FilterQuery<FormPayment>): void {
    // Если $or уже есть на верхнем уровне, добавляем в него
    if (query.$or) {
      query.$or = [...query.$or, condition];
    } else if (query.$and) {
      // Если $or перемещен в $and, находим его и добавляем условие
      const orInAnd = query.$and.find((cond) => cond.$or && Array.isArray(cond.$or));
      if (orInAnd && orInAnd.$or) {
        orInAnd.$or = [...orInAnd.$or, condition];
      } else {
        // Если нет $or в $and, создаем новый
        query.$and.push({ $or: [condition] });
      }
    } else {
      // Если нет ни $or, ни $and, создаем новый $or
      query.$or = [condition];
    }
  }

  protected async makeQuery({
    _ids,
    uid,
    statuses,
    status,
    agents,
    forImportByStatuses,
    forExportByStatuses,
    totalsPaidDateLte,
    totalsIsEventSentExpiresPaidDate,
    organization,
    notInStatuses,
    organizationInn,
    coverAmount,
    feeAmount,
    clientCurrency,
    organizationSubaccount,
    clientCurrencies,
    counterpartyCurrency,
    counterpartyCurrencies,
    amountGte,
    amountLte,
    direction,
    directions,
    sentDateGte,
    sentDateLt,
    createDateGte,
    createDateLt,
    updateDateGte,
    updateDateLt,
    manager,
    managers,
    provider,
    providers,
    isImportant,
    orderAcceptanceDateExists,
    clientOrganizationName,
    providerOrganization,
    search,
    coverAmountExists,
    amountExists,
    stages,
    isProviderCompletedPayment,
    sourceFormId,
    copyDateGte,
    copyDateLte,
    platformPaymentCondition,
    platformPostpayMode,
    platformPostpayModes,
    isFreeze,
    isAvailable,
    ...findData
  }: IFormPaymentQuery): Promise<FilterQuery<FormPayment>> {
    const query: FilterQuery<FormPayment> = { ...findData };
    // Явно копируем MongoDB операторы, если они есть (они могут быть в findData, но не в типе IFormPaymentQuery)
    // Используем type guard функции для безопасного извлечения свойств без type assertion
    const orValue = this.getMongoOperator(findData, '$or');
    if (orValue) {
      query.$or = orValue;
    }
    const andValue = this.getMongoOperator(findData, '$and');
    if (andValue) {
      query.$and = andValue;
    }

    if (_ids) {
      query._id = { $in: _ids };
    }

    if (uid) {
      query['uid'] = uid;
    }

    if (search) {
      const searchConditions: FilterQuery<FormPayment>[] = [];

      const searchExpr = {
        $regexMatch: {
          input: { $toString: '$uid' },
          regex: search,
        },
      };
      searchConditions.push({ $expr: searchExpr });

      // Ищем по названию организации
      searchConditions.push({
        'organization.name': new RegExp(search, 'gi'),
      });

      const searchNumber = Number(search);
      if (!isNaN(searchNumber) && isFinite(searchNumber)) {
        searchConditions.push({
          'totals.amount': searchNumber * 100,
        });
      } else {
        const amountSearchExpr = {
          $regexMatch: {
            input: { $toString: '$totals.amount' },
            regex: search,
          },
        };
        searchConditions.push({ $expr: amountSearchExpr });
      }

      // Используем $or для поиска по всем полям
      if (query.$or) {
        query.$or = [...query.$or, ...searchConditions];
      } else {
        query.$or = searchConditions;
      }
    }

    const statusList = statuses?.length ? statuses : status ? [status] : undefined;

    if (statusList?.length) {
      query.status = { $in: statusList };
    }

    if (stages?.length) {
      query.stage = { $in: stages };
    }

    if (agents?.length) {
      query.agent = { $in: agents };
    }

    if (forImportByStatuses) {
      const importCondition = {
        status: { $in: forImportByStatuses },
        direction: FormPaymentDirection.IMPORT,
      };
      // Добавляем условие в существующий $or или создаем новый
      this.addToOrCondition(query, importCondition);
    }

    if (forExportByStatuses?.length) {
      const exportCondition = {
        status: { $in: forExportByStatuses },
        direction: FormPaymentDirection.EXPORT,
      };
      // Добавляем условие в существующий $or или создаем новый
      this.addToOrCondition(query, exportCondition);
    }

    if (totalsPaidDateLte) {
      query['totals.paidDate'] = { $lte: totalsPaidDateLte };
    }

    if (_.isBoolean(totalsIsEventSentExpiresPaidDate)) {
      query['totals.isEventSentExpiresPaidDate'] = totalsIsEventSentExpiresPaidDate;
    }

    if (orderAcceptanceDateExists) {
      query.orderAcceptanceDate = { $exists: true };
    }

    if (organization) {
      query['organization._id'] = organization;
      query['organization._id'] = organization;
    }

    if (clientOrganizationName) {
      query['organization.name'] = new RegExp(clientOrganizationName, 'gi');
    }

    if (notInStatuses?.length) {
      query.status = { $nin: notInStatuses };
    }

    if (organizationInn) {
      query['organization.inn'] = organizationInn;
    }

    if (coverAmount) {
      query['totals.coverAmount'] = coverAmount;
    }

    if (!_.isNil(feeAmount)) {
      query['totals.feeAmount'] = feeAmount;
    }

    if (clientCurrency || (clientCurrencies && clientCurrencies.length)) {
      query['currency.client'] = clientCurrencies?.length ? { $in: clientCurrencies } : clientCurrency;
    }

    if (counterpartyCurrency || (counterpartyCurrencies && counterpartyCurrencies.length)) {
      query['currency.counterparty'] = counterpartyCurrencies?.length
        ? { $in: counterpartyCurrencies }
        : counterpartyCurrency;
    }

    if (!_.isUndefined(amountGte) || !_.isUndefined(amountLte)) {
      query['totals.amount'] = {
        ...(amountGte !== undefined && { $gte: amountGte }),
        ...(amountLte !== undefined && { $lte: amountLte }),
      };
    }

    if (direction || (directions && directions.length)) {
      query['direction'] = directions?.length ? { $in: directions } : direction;
    }

    if (sentDateGte || sentDateLt) {
      const sentDateCondition: { $gte?: Date; $lt?: Date } = {};
      if (sentDateGte) {
        sentDateCondition.$gte = sentDateGte;
      }
      if (sentDateLt) {
        sentDateCondition.$lt = sentDateLt;
      }

      // Для новых заявок sentDate может быть не заполнено, поэтому используем createDate
      // Если фильтруем по stages, включая "new", нужно учесть записи без sentDate
      // Но если пользователь явно указал createDateGte/createDateLt, fallback не нужен
      if (stages?.length && stages.includes(FormPaymentStage.NEW) && !createDateGte && !createDateLt) {
        // Используем $or для учета записей с sentDate в диапазоне или без sentDate, но с createDate в диапазоне
        const dateConditions = [
          {
            sentDate: sentDateCondition,
          },
          {
            $or: [{ sentDate: { $exists: false } }, { sentDate: null }],
            createDate: {
              ...(sentDateGte && { $gte: sentDateGte }),
              ...(sentDateLt && { $lt: sentDateLt }),
            },
          },
        ];

        // Правильно объединяем условия по дате с существующими условиями через $and
        this.mergeOrCondition(query, dateConditions);
      } else {
        query.sentDate = sentDateCondition;
      }
    }

    if (createDateGte || createDateLt) {
      query.createDate = {
        ...(createDateGte && { $gte: convertMoscowTimeToUTC(createDateGte) }),
        ...(createDateLt && { $lt: convertMoscowTimeToUTC(createDateLt) }),
      };
    }

    if (updateDateGte || updateDateLt) {
      query.updateDate = {
        ...(updateDateGte && { $gte: updateDateGte }),
        ...(updateDateLt && { $lt: updateDateLt }),
      };
    }

    if (manager || (managers && managers.length)) {
      query['manager'] = managers?.length ? { $in: managers } : manager;
    }

    if (provider || (providers && providers.length)) {
      query['provider'] = providers?.length ? { $in: providers } : provider;
    }

    if (_.isBoolean(isImportant)) {
      query['isImportant'] = isImportant;
    }

    if (_.isBoolean(providerOrganization)) {
      query['providerOrganization'] = { $exists: providerOrganization };
    }

    if (_.isString(providerOrganization) || _.isArray(providerOrganization)) {
      query['providerOrganization._id'] = {
        $in: [].concat(providerOrganization),
      };
    }

    if (coverAmountExists) {
      query['totals.coverAmount'] = { $exists: true };
    }

    if (amountExists) {
      query['totals.amount'] = { $exists: true };
    }

    if (_.isBoolean(isProviderCompletedPayment)) {
      if (isProviderCompletedPayment) {
        query.paymentByProviderDate = { $exists: true };
      } else {
        query.paymentByProviderDate = { $exists: false };
      }
    }

    if (platformPaymentCondition) {
      query.platformPaymentCondition = platformPaymentCondition;
    }

    if (platformPostpayMode || (platformPostpayModes && platformPostpayModes.length)) {
      query.platformPostpayMode = platformPostpayModes?.length ? { $in: platformPostpayModes } : platformPostpayMode;
    }

    if (organizationSubaccount) {
      if (query.account) {
        const subaccountConditions = [
          { account: query.account },
          { 'organization.subaccounts.account': organizationSubaccount },
          { 'organization.account': organizationSubaccount },
        ];

        // Правильно объединяем условия subaccount с существующими условиями через $and
        this.mergeOrCondition(query, subaccountConditions);

        // Удалим прямой account, чтобы он не конфликтовал с $or
        delete query.account;
      } else {
        // account не указан — фильтруем только по organizationSubaccount
        query['organization.subaccounts.account'] = organizationSubaccount;
      }
    }

    // Обработка полей для функционала копирования заявок
    if (sourceFormId) {
      query['sourceFormId'] = sourceFormId;
    }

    if (copyDateGte || copyDateLte) {
      query.copyDate = {
        ...(copyDateGte && { $gte: copyDateGte }),
        ...(copyDateLte && { $lte: copyDateLte }),
      };
    }

    // Фильтр по заморозке экспортной сделки
    if (isFreeze !== undefined) {
      query.isFreeze = isFreeze;
    }

    // Фильтр по доступности экспортной сделки
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable;
    }

    // Проверяем, что условия доступа не потеряны (для запросов через buildQueryWithOrganizationAccess)
    // Если в исходном запросе был $or или $and, они должны быть сохранены
    const hasAccessConditions = query.$or || query.$and || query.account;
    if (!hasAccessConditions) {
      const originalOr = this.getMongoOperator(findData, '$or');
      if (originalOr) {
        this.logger.error(
          `Security issue: Access conditions ($or) were lost! Original had: ${JSON.stringify(originalOr)}`,
        );
        // Восстанавливаем условия доступа из исходного запроса
        if (query.$and) {
          query.$and.push({ $or: originalOr });
        } else {
          query.$and = [{ $or: originalOr }];
        }
      }
    }

    return query;
  }

  // Метод для копирования заявки
  async copyForm(sourceFormId: string, account: string, amount: number): Promise<IFormPayment> {
    // 1. Находим исходную заявку
    const sourceForm = await this.findOneOrException({ _id: sourceFormId });

    if (!sourceForm) {
      throw new BadRequestException('Source form not found');
    }

    if (typeof sourceForm.account === 'string') {
      throw new BadRequestException('Source form account is not a object');
    }

    // 2. Проверяем, что пользователь имеет доступ к исходной заявке
    if (sourceForm.account._id?.toString() !== account) {
      throw new BadRequestException('Access denied to source form');
    }

    // 3. Создаем новую заявку на основе исходной
    const copiedFormData: IFormPaymentCreateCopy = {
      account,
      status: FormPaymentStatus.DRAFT,
      prevStatus: FormPaymentStatus.DRAFT,
      // Копируем все данные кроме ID, статусов, дат
      direction: sourceForm.direction,
      currency: sourceForm.currency,
      counterparty: sourceForm.counterparty,
      intermediary: sourceForm.intermediary,
      contract:
        typeof sourceForm.contract === 'string'
          ? sourceForm.contract
          : ((sourceForm.contract as IFile | undefined)?._id as string | undefined),
      invoices: sourceForm.invoices?.map((invoice) => _.omit(invoice, ['contract'])),
      organization:
        typeof sourceForm.organization === 'string'
          ? sourceForm.organization
          : { ...sourceForm.organization, isChanged: false },
      totals: {
        ...sourceForm.totals,
        amount: amount, // Устанавливаем новую сумму
      },
      platformPaymentCondition: FormPaymentCondition.ADVANCE,
      provider: sourceForm.provider,
      preferedProvider: sourceForm.preferedProvider,
      agent: sourceForm.agent,
      agentRequisites: sourceForm.agentRequisites,
      clientOrganization: sourceForm.clientOrganization,
      organizationName: sourceForm.organizationName,
      signer: sourceForm.signer,
      manager: sourceForm.manager,
      // Поля для функционала копирования
      sourceFormId: sourceFormId,
      copyDate: new Date(),
    };

    // 4. Создаем скопированную заявку
    const copiedForm = await this.create(copiedFormData);

    // 5. Обработка логики апрува организации
    await this.handleOrganizationApprovalForCopy(copiedForm, sourceForm);

    return copiedForm;
  }

  // Приватный метод для обработки апрува организации при копировании
  private async handleOrganizationApprovalForCopy(copiedForm: IFormPayment, sourceForm: IFormPayment): Promise<void> {
    // Проверяем, является ли исходная заявка скопированной (наличие sourceFormId)
    if (sourceForm.sourceFormId) {
      const originalForm = await this.findOneOrException({ _id: sourceForm._id });

      if (typeof originalForm.organization === 'string') {
        throw new BadRequestException('Original form organization is not a object');
      }

      if (typeof copiedForm.organization === 'string') {
        throw new BadRequestException('Copied form organization is not a object');
      }

      if (originalForm.organization.status === OrganizationStatus.APPROVED) {
        // Копируем апрув организации и дату апрува
        copiedForm.organization.status = OrganizationStatus.APPROVED;
        await this.updateOne({ _id: copiedForm._id }, { organization: copiedForm.organization });

        const expiryDate = moment().subtract(ORGANIZATION_APPROVAL_EXPIRY_MONTHS, 'months');
        const approvedAt = copiedForm.organization.approvedAt;

        if (moment(approvedAt).isBefore(expiryDate)) {
          // Если апрув старше ORGANIZATION_APPROVAL_EXPIRY_MONTHS месяцев, требуется реапрув
          copiedForm.organization.status = OrganizationStatus.NOT_APPROVED;
          await this.updateOne({ _id: copiedForm._id }, { organization: copiedForm.organization });
        }
      }
    }
  }

  // HS Codes методы

  async updateInvoiceHsCodes(
    formId: string,
    accountId: string,
    invoiceUuid: string,
    codes: string[],
  ): Promise<IFormPayment> {
    const form = await this.findOneOrException({ _id: formId, account: accountId });
    this.findInvoiceIndexInForm(form, invoiceUuid);
    const uniqueCodes = this.validateAndDeduplicateCodes(codes, formId);

    const hsCodesArray = await this.hsCodeService.findMany({ codes: uniqueCodes });
    const hsCodesMap = new Map(hsCodesArray.map((hsCode) => [hsCode.code, hsCode]));

    const processedCodes = await this.createHsCodeSnapshots(uniqueCodes, hsCodesMap);

    const updatedForm = await this.model
      .findOneAndUpdate(
        { _id: formId, account: accountId, 'invoices.uuid': invoiceUuid },
        { $set: { 'invoices.$.hsCodes': processedCodes } },
        { new: true },
      )
      .exec();

    if (!updatedForm) {
      throw new BadRequestException(`Failed to update HS codes for invoice ${invoiceUuid}`);
    }

    this.logger.log(`[Form ${formId}, Invoice ${invoiceUuid}] Successfully updated ${processedCodes.length} HS codes`);

    const plainForm = await this.toPlain(updatedForm);
    await this.notifyFormPaymentUpdate(plainForm);

    return plainForm;
  }

  private findInvoiceIndexInForm(form: IFormPayment, invoiceUuid: string): number {
    if (!form.invoices) {
      throw new BadRequestException('No invoices found');
    }

    const invoiceIndex = form.invoices.findIndex((inv) => inv.uuid === invoiceUuid);
    if (invoiceIndex === -1) {
      throw new BadRequestException(`Invoice ${invoiceUuid} not found`);
    }

    return invoiceIndex;
  }

  private validateAndDeduplicateCodes(codes: string[], formId: string): string[] {
    if (codes.length === 0) {
      throw new BadRequestException(
        'Codes array cannot be empty. To remove all codes, use DELETE endpoint or remove the invoice',
      );
    }

    const uniqueCodes = [...new Set(codes)];

    if (uniqueCodes.length < codes.length) {
      const duplicatesCount = codes.length - uniqueCodes.length;
      this.logger.debug(`[Form ${formId}] Removed ${duplicatesCount} duplicate codes from ${codes.length} total`);
    }

    this.logger.debug(`[Form ${formId}] Updating HS codes: ${uniqueCodes.length} unique codes`);

    return uniqueCodes;
  }

  private async createHsCodeSnapshots(
    uniqueCodes: string[],
    hsCodesMap: Map<string, IHsCode>,
  ): Promise<IHsCodeSnapshot[]> {
    const processedCodes: IHsCodeSnapshot[] = [];

    for (const code of uniqueCodes) {
      const snapshot = this.createHsCodeSnapshot(code, hsCodesMap);
      processedCodes.push(snapshot);
    }

    return processedCodes;
  }

  private createHsCodeSnapshot(code: string, hsCodesMap: Map<string, IHsCode>): IHsCodeSnapshot {
    const hsCode = hsCodesMap.get(code);

    if (hsCode && !hsCode.active) {
      throw new BadRequestException(`Code ${code} is not supported by the platform at the moment`);
    }

    if (hsCode && hsCode.active) {
      return {
        code: hsCode.code,
        chapter: hsCode.chapter,
        section: hsCode.section,
        type: hsCode.type,
        loyalty: hsCode.loyalty,
        comment: hsCode.comment,
        isManual: false,
        isActive: true,
      };
    }

    return {
      code,
      isManual: true,
      isActive: true,
    };
  }

  private async notifyFormPaymentUpdate(updatedForm: IFormPayment): Promise<void> {
    await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
      action: SocketMessageAction.UPDATE,
      formPayment: updatedForm,
    });
  }

  private validateInvoicesHaveHsCodes(invoices: IFormPayment['invoices']): void {
    this.hsCodeIntegrationService.validateInvoicesHaveCodes(invoices);
  }

  async checkHsCodesRiskAndProcess(formId: string): Promise<{
    shouldAutoReject: boolean;
    statusToSet?: string;
    reason?: string;
  }> {
    const form = await this.findOneOrException(
      { _id: formId },
      {
        include: ['account'],
      },
    );

    // Check if form has goods invoices
    const hasGoodsInvoices = form.invoices?.some((inv) => inv.kind === FormPaymentKind.GOOD) ?? false;

    // Get HS code snapshots (only from goods invoices)
    const snapshots = this.hsCodeIntegrationService.getHsCodeSnapshots(form.invoices);

    // Process HS codes through auto-processing service
    // Check if CLIENT organization is approved (for internal compliance skip)
    const clientOrganizationApproved =
      typeof form.organization === 'object' && form.organization?.status === OrganizationStatus.APPROVED;

    this.logger.debug(`[Form ${formId}] Client organization approved: ${clientOrganizationApproved}`);

    const baseResult = this.autoProcessingService.processHsCodeSnapshots(
      snapshots,
      hasGoodsInvoices,
      clientOrganizationApproved,
    );

    let statusToSet = baseResult.statusToSet;
    let reason = baseResult.reason;

    // Even if auto-processing says we can skip compliance (all HS codes OK, organization approved),
    // external compliance can be skipped only when the counterparty was approved recently.
    if (
      !baseResult.shouldAutoReject &&
      baseResult.shouldAllowSkipCompliance &&
      statusToSet === FormPaymentStatus.FORM_ACCEPTED
    ) {
      let canSkipExternal = false;

      if (this.counterpartyHook && form.counterpartyRef) {
        try {
          const counterpartyId =
            typeof form.counterpartyRef === 'string' ? form.counterpartyRef : String(form.counterpartyRef);

          canSkipExternal = await this.counterpartyHook.checkAutoSkipExternalCompliance(counterpartyId);
        } catch (err) {
          this.logger.error(
            `Failed to check auto-skip external compliance for form ${formId}: ${err?.message}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }

      if (!canSkipExternal) {
        statusToSet = FormPaymentStatus.FORM_WAITING_VERIFICATION;
        reason =
          `${baseResult.reason} | External compliance required: ` +
          'counterparty not recently approved or no counterparty linked';
      }
    }

    // Apply status change for ALL scenarios (auto-reject, force verification, skip compliance)
    // ONLY if status actually changes (prevent prevStatus corruption)
    if (statusToSet && statusToSet !== form.status) {
      let updatedForm = await this.updateOne({ _id: formId }, { status: statusToSet, prevStatus: form.status });

      if (
        statusToSet === FormPaymentStatus.FORM_ACCEPTED &&
        updatedForm &&
        this.isRateOnProviderPostpayImportScenario({
          direction: updatedForm.direction,
          platformPaymentCondition: updatedForm.platformPaymentCondition,
          platformPostpayMode: updatedForm.platformPostpayMode,
        })
      ) {
        try {
          updatedForm = await this.ensureRateOnProviderFeeTermsOnAccept({
            formPayment: { ...updatedForm, account: updatedForm.account || form.account },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to set fee terms for form ${formId} on FORM_ACCEPTED: ${message}`);
        }
      }

      // Автофиксация курса и комиссии при автопереходе в FORM_ACCEPTED
      if (
        statusToSet === FormPaymentStatus.FORM_ACCEPTED &&
        updatedForm &&
        !this.isPricingFixed(updatedForm) &&
        this.hasAccountRateSettings(form.account) &&
        !(
          updatedForm.direction === FormPaymentDirection.IMPORT &&
          updatedForm.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
          updatedForm.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP
        )
      ) {
        try {
          await this.fixRate(String(updatedForm._id));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to auto fix rate for form ${formId} after HS code processing: ${message}`);
        }
      }

      // Differentiate logging by scenario for better observability
      if (baseResult.shouldAutoReject) {
        this.logger.warn(`Form ${formId} auto-rejected due to HS code check: ${reason}`);
      } else if (baseResult.shouldForceVerification) {
        this.logger.debug(`Form ${formId} requires verification: ${reason}`);
      } else if (baseResult.shouldAllowSkipCompliance && statusToSet === FormPaymentStatus.FORM_ACCEPTED) {
        this.logger.log(`Form ${formId} allowed to skip compliance: ${reason}`);
      } else {
        this.logger.debug(`Form ${formId} HS code processing updated status to ${statusToSet}: ${reason}`);
      }
    }

    return {
      shouldAutoReject: baseResult.shouldAutoReject,
      statusToSet,
      reason,
    };
  }

  async getAggregatedHsCodes(
    formId: string,
    accountId?: string,
  ): Promise<{
    hsCodes: Array<{
      code: string;
      description?: string;
      loyalty?: string;
      isManual: boolean;
      isActive: boolean;
      invoiceCount: number;
    }>;
    totalCodes: number;
    manualCodesCount: number;
    inactiveCodesCount: number;
    canApprove: boolean;
  }> {
    const form = await this.findOneOrException(accountId ? { _id: formId, account: accountId } : { _id: formId });

    const codesMap = new Map<
      string,
      {
        code: string;
        description?: string;
        loyalty?: string;
        isManual: boolean;
        isActive: boolean;
        invoiceCount: number;
      }
    >();

    if (form.invoices) {
      // Only aggregate HS codes from goods invoices (kind='good')
      // Service invoices (kind='service') are excluded
      const goodsInvoices = form.invoices.filter((inv) => inv.kind === FormPaymentKind.GOOD);

      for (const invoice of goodsInvoices) {
        if (invoice.hsCodes) {
          for (const hsCode of invoice.hsCodes) {
            const key = hsCode.code;
            const existing = codesMap.get(key);

            if (existing) {
              existing.invoiceCount += 1;
            } else {
              codesMap.set(key, {
                code: hsCode.code,
                description: hsCode.chapter,
                loyalty: hsCode.loyalty,
                isManual: hsCode.isManual,
                isActive: hsCode.isActive,
                invoiceCount: 1,
              });
            }
          }
        }
      }

      const servicesCount = form.invoices.length - goodsInvoices.length;
      if (servicesCount > 0) {
        this.logger.debug(
          `[Form ${formId}] Aggregated HS codes from ${goodsInvoices.length} goods invoices, ` +
            `${servicesCount} service invoices excluded (HS codes not applicable)`,
        );
      }
    }

    const hsCodes = Array.from(codesMap.values());
    const manualCodesCount = hsCodes.filter((c) => c.isManual).length;
    const inactiveCodesCount = hsCodes.filter((c) => !c.isActive).length;
    const canApprove = manualCodesCount === 0 && inactiveCodesCount === 0;

    return {
      hsCodes,
      totalCodes: hsCodes.length,
      manualCodesCount,
      inactiveCodesCount,
      canApprove,
    };
  }

  async getSuggestedProviders(
    formId: string,
    userRole: string,
    accountId?: string,
  ): Promise<
    Array<{
      _id: string;
      name: string;
      inn?: string;
      exactMatches: number;
      prefixMatches: number;
      totalCoverage: number;
      coveragePercent: number;
      coveredCodes: string[];
      isPreferred: boolean;
    }>
  > {
    const form = await this.findOneOrException(accountId ? { _id: formId, account: accountId } : { _id: formId });
    const uniqueCodes = this.extractUniqueHsCodesFromForm(form);
    const providers = await this.organizationService.findMany({
      type: OrganizationType.PROVIDER,
      isActive: true,
    });

    this.logger.debug(`[Form ${formId}] Found ${providers.length} providers, matching ${uniqueCodes.size} HS codes`);

    const suggestions = providers
      .map((provider) => this.calculateMatchesForProvider(provider, uniqueCodes))
      .filter((s) => (userRole === AccountRole.USER ? s.totalCoverage > 0 : true))
      .sort((a, b) => {
        const exactDiff = b.exactMatches - a.exactMatches;
        return exactDiff !== 0 ? exactDiff : b.prefixMatches - a.prefixMatches;
      });

    const preferedProviderId =
      typeof form.preferedProvider === 'string' ? form.preferedProvider : form.preferedProvider?._id?.toString?.();

    this.markPreferredProvider(suggestions, formId, preferedProviderId);
    return suggestions;
  }

  private extractUniqueHsCodesFromForm(form: IFormPayment): Set<string> {
    // Use HsCodeIntegrationService which properly filters goods invoices only
    // and keeps only codes with loyalty = OK for provider matching
    const codes = this.hsCodeIntegrationService.extractUniqueHsCodes(form.invoices);
    return new Set(codes);
  }

  private calculateMatchesForProvider(provider: IProviderOrganization, uniqueCodes: Set<string>) {
    const exactMatches = this.countExactMatches(provider, uniqueCodes);
    const prefixMatches = this.countPrefixMatches(provider, uniqueCodes, exactMatches);
    const totalCoverage = exactMatches.size + prefixMatches.size;
    const coveragePercent = uniqueCodes.size > 0 ? Math.round((totalCoverage / uniqueCodes.size) * 100) : 0;

    return {
      _id: provider._id,
      name: provider.name,
      inn: provider.inn,
      exactMatches: exactMatches.size,
      prefixMatches: prefixMatches.size,
      totalCoverage,
      coveragePercent,
      coveredCodes: [...exactMatches, ...prefixMatches],
      isPreferred: false,
    };
  }

  private countExactMatches(provider: IProviderOrganization, uniqueCodes: Set<string>): Set<string> {
    return new Set(provider.hsCodes?.filter((code: string) => uniqueCodes.has(code)) || []);
  }

  private countPrefixMatches(
    provider: IProviderOrganization,
    uniqueCodes: Set<string>,
    exactMatches: Set<string>,
  ): Set<string> {
    const prefixMatches = new Set<string>();

    if (!provider.hsCodePrefixes) {
      return prefixMatches;
    }

    const codesArray = Array.from(uniqueCodes);
    for (const code of codesArray) {
      if (!exactMatches.has(code)) {
        const matchedByPrefix = provider.hsCodePrefixes.some((prefix: string) => code.startsWith(prefix));
        if (matchedByPrefix) {
          prefixMatches.add(code);
        }
      }
    }

    return prefixMatches;
  }

  private markPreferredProvider(
    suggestions: Array<{
      _id: string;
      name: string;
      inn?: string;
      exactMatches: number;
      prefixMatches: number;
      totalCoverage: number;
      coveragePercent: number;
      coveredCodes: string[];
      isPreferred: boolean;
    }>,
    formId: string,
    preferedProviderId?: string,
  ): void {
    this.logger.debug(`[Form ${formId}] Suggested ${suggestions.length} providers`);

    if (preferedProviderId) {
      const matched = suggestions.find((p) => p._id === preferedProviderId || p._id.toString() === preferedProviderId);
      if (matched) {
        matched.isPreferred = true;
        return;
      }
    }

    if (suggestions.length > 0) {
      suggestions[0].isPreferred = true;
    }
  }

  async validateHsCodesForApproval(formId: string): Promise<{ valid: boolean; errors: string[] }> {
    const form = await this.findOneOrException({ _id: formId });
    const aggregated = await this.getAggregatedHsCodes(formId);
    const errors: string[] = [];

    // Check that each goods invoice has at least one HS code (services don't require HS codes)
    this.validateInvoicesHaveHsCodes(form.invoices);

    if (aggregated.manualCodesCount > 0) {
      errors.push(`Found ${aggregated.manualCodesCount} manual HS codes that require approval`);
    }

    if (aggregated.inactiveCodesCount > 0) {
      errors.push(`Found ${aggregated.inactiveCodesCount} inactive HS codes`);
    }

    const result = {
      valid: errors.length === 0,
      errors,
    };

    this.logger.debug(
      `[Form ${formId}] HS codes validation result: valid=${result.valid}, manual=${aggregated.manualCodesCount}, inactive=${aggregated.inactiveCodesCount}`,
    );

    return result;
  }

  async updateSnapshotsOnDeactivate(hsCode: string, hsCodeId: string): Promise<void> {
    const approvedStatuses = [
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.PAYMENT_SENT,
      FormPaymentStatus.COMPLETED,
    ];

    try {
      const result = await this.model.updateMany(
        {
          status: { $nin: approvedStatuses },
          'invoices.hsCodes.code': hsCode,
        },
        {
          $set: {
            'invoices.$[].hsCodes.$[hsCodeFilter].isActive': false,
          },
        },
        {
          arrayFilters: [{ 'hsCodeFilter.code': hsCode }],
        },
      );

      this.logger.debug(`Deactivated HS code ${hsCode} (ID: ${hsCodeId}) in ${result.modifiedCount} forms`);

      if (result.matchedCount > 0 && result.modifiedCount === 0) {
        this.logger.warn(`HS code ${hsCode} found in ${result.matchedCount} forms but none modified`);
      }
    } catch (error) {
      this.logger.error(`Failed to deactivate HS code ${hsCode} in forms`, error);
      throw new Error(
        `Failed to update forms after deactivating ${hsCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async updateSnapshotsOnActivate(hsCode: IHsCode): Promise<void> {
    try {
      const result = await this.model.updateMany(
        { 'invoices.hsCodes.code': hsCode.code },
        {
          $set: {
            'invoices.$[].hsCodes.$[hsCodeFilter].chapter': hsCode.chapter,
            'invoices.$[].hsCodes.$[hsCodeFilter].section': hsCode.section,
            'invoices.$[].hsCodes.$[hsCodeFilter].type': hsCode.type,
            'invoices.$[].hsCodes.$[hsCodeFilter].loyalty': hsCode.loyalty,
            'invoices.$[].hsCodes.$[hsCodeFilter].comment': hsCode.comment,
            'invoices.$[].hsCodes.$[hsCodeFilter].isActive': true,
            'invoices.$[].hsCodes.$[hsCodeFilter].isManual': false,
          },
        },
        {
          arrayFilters: [{ 'hsCodeFilter.code': hsCode.code }],
        },
      );

      this.logger.debug(
        `Activated HS code ${hsCode.code} (ID: ${hsCode._id}) in ${result.modifiedCount} forms (auto-replaced manual codes)`,
      );
    } catch (error) {
      this.logger.error(`Failed to activate HS code ${hsCode.code} in forms`, error);
      throw new Error(
        `Failed to update forms after activating ${hsCode.code}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async updateSnapshotsOnDelete(hsCode: string): Promise<void> {
    const approvedStatuses = [
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
      FormPaymentStatus.PAYMENT_SENT,
      FormPaymentStatus.COMPLETED,
    ];

    try {
      const result = await this.model.updateMany(
        {
          status: { $nin: approvedStatuses },
          'invoices.hsCodes': { $elemMatch: { code: hsCode, isManual: false } },
        },
        {
          $set: {
            'invoices.$[].hsCodes.$[hsCodeFilter]': {
              code: hsCode,
              isManual: true,
              isActive: true,
            },
          },
        },
        {
          arrayFilters: [{ 'hsCodeFilter.code': hsCode, 'hsCodeFilter.isManual': false }],
        },
      );

      this.logger.debug(`Set HS code ${hsCode} to manual in ${result.modifiedCount} unapproved forms`);
    } catch (error) {
      this.logger.error(`Failed to convert HS code ${hsCode} to manual in forms`, error);
      throw new Error(
        `Failed to update forms after deleting ${hsCode}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async logFormPaymentStatusChange(
    ctx: FeatureContext,
    formPaymentId: string,
    status: FormPaymentStatus,
  ): Promise<void> {
    await this.formPaymentStatusService.create({
      formPaymentId,
      status,
      accountId: ctx.accountId,
      accountRoles: [...ctx.accountRoles],
    });
  }

  private async syncOrganizationStatus(
    ctx: FeatureContext,
    formPayment: IFormPayment,
    newStatus: FormPaymentStatus,
  ): Promise<void> {
    if (typeof formPayment.organization === 'string') {
      return;
    }

    const refOrgId = formPayment.organization?.refOrganizationId;
    const isChanged = formPayment.organization?.isChanged;

    if (!refOrgId || isChanged) {
      return;
    }

    let orgStatus: OrganizationStatus | null = null;

    if (newStatus === FormPaymentStatus.FORM_WAITING_VERIFICATION) {
      orgStatus = OrganizationStatus.APPROVED;
    }

    if (newStatus === FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER) {
      orgStatus = OrganizationStatus.NOT_APPROVED;
    }

    if (orgStatus) {
      await this.organizationModel.updateOne({ _id: refOrgId }, { $set: { status: orgStatus } });

      await this.organizationStatusesHistoryService.create({
        organizationId: refOrgId as unknown as string,
        status: orgStatus,
        accountId: ctx.accountId,
        accountRoles: [...ctx.accountRoles],
      });

      this.logger.log(
        `Organization ${refOrgId} status synchronized to ${orgStatus} (triggered by FormPayment ${formPayment._id})`,
      );
    }
  }

  /**
   * Анализирует контрагента через ChatGPT и сохраняет результат в complianceReport
   * @param formPaymentId - ID заявки на оплату
   * @returns ID задачи в очереди (jobId)
   */
  async analyzeCounterpartyWithChatGpt(formPaymentId: string): Promise<JobId> {
    // Проверяем, включен ли ChatGPT
    const isChatGptActive = this.configService.get('recognize.chatgpt.isActive');
    if (!isChatGptActive) {
      throw new BadRequestException('ChatGPT service is not active.');
    }

    const formPayment = await this.findOneOrException({ _id: formPaymentId });

    if (!Object.keys(formPayment.counterparty || {}).length) {
      throw new BadRequestException('The application does not contain information about the counterparty.');
    }

    // Проверяем количество запросов (максимум 5)
    const currentRequestCount = formPayment.complianceReport?.requestCount || 0;
    const MAX_REQUESTS = 5;
    if (currentRequestCount >= MAX_REQUESTS) {
      throw new BadRequestException(
        `Maximum number of requests (${MAX_REQUESTS}) has been reached for this compliance report.`,
      );
    }

    // Увеличиваем счетчик запросов
    const newRequestCount = currentRequestCount + 1;
    await this.updateOne(
      { _id: formPaymentId },
      {
        complianceReport: {
          requestCount: newRequestCount,
          updatedDate: new Date(),
        },
      },
    );

    this.logger.log(
      `Adding a counterparty analysis to the request queue ${formPaymentId} (request ${newRequestCount}/${MAX_REQUESTS})`,
    );

    // Читаем промпт из файла
    const promptTemplate = await this.readPromptFromFile();

    // Формируем данные контрагента для промпта
    const counterpartyData = this.formatCounterpartyData(formPayment.counterparty);

    // Добавляем задачу в очередь для асинхронной обработки и возвращаем jobId
    const jobId = await this.chatGptService.addAnalyzeCounterpartyToQueue(
      formPaymentId,
      promptTemplate,
      counterpartyData,
      newRequestCount,
    );

    return jobId;
  }

  /**
   * Читает промпт из файла prompt.md
   */
  private async readPromptFromFile(): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const promptPath = path.join(process.cwd(), 'prompt.md');
      const promptContent = await fs.readFile(promptPath, 'utf-8');
      return promptContent;
    } catch (error) {
      this.logger.warn(`Failed to read prompt.md, using simplified prompt: ${error.message}`);
      // Возвращаем базовый промпт если файл не найден
      return `Вы профессиональный аналитик комплаенс и рисков с экспертизой в области международной торговли, AML/CFT и экспортного контроля.
      Проведите комплексный анализ контрагента и предоставьте структурированный отчет с оценкой рисков.
      В конце ответа укажите общий уровень риска: Low, Medium, High или Critical.`;
    }
  }

  /**
   * Форматирует данные контрагента для промпта в формате JSON
   * Фильтрует пустые значения и возвращает JSON строку
   */
  private formatCounterpartyData(counterparty: Partial<IFormBankDetails>): string {
    // Фильтруем только заполненные поля
    const data = Object.fromEntries(Object.entries(counterparty).filter(([, value]) => value != null && value !== ''));

    return JSON.stringify(data, null, 2);
  }

  private async resolveAgentDetails(agentField?: string | IAgent): Promise<{ agentId?: string; agentName?: string }> {
    if (!agentField) {
      return {};
    }

    if (typeof agentField === 'string') {
      try {
        const agent = await this.client.send<IAgent>(AgentPattern.FIND_ONE_OR_EXCEPTION, {
          query: { _id: agentField },
        });

        return {
          agentId: agent._id ? String(agent._id) : agentField,
          agentName: agent.organizationName,
        };
      } catch (error) {
        this.logger.warn(
          `Failed to resolve agent ${agentField} for liquidity update: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return { agentId: agentField };
      }
    }

    return {
      agentId: agentField._id ? String(agentField._id) : undefined,
      agentName: agentField.organizationName,
    };
  }

  private extractProviderDetails(providerOrganization?: string | IFormPaymentOrganization): {
    providerId?: string;
    providerName?: string;
    accountNumber?: string;
  } {
    if (!providerOrganization) {
      return {};
    }

    if (typeof providerOrganization === 'string') {
      return { providerId: providerOrganization };
    }

    // Извлекаем ID провайдера (приоритет: refOrganizationId > _id)
    let providerId: string | undefined;
    if (providerOrganization.refOrganizationId) {
      providerId =
        typeof providerOrganization.refOrganizationId === 'string'
          ? providerOrganization.refOrganizationId
          : String(providerOrganization.refOrganizationId);
    } else if (providerOrganization._id) {
      providerId =
        typeof providerOrganization._id === 'string' ? providerOrganization._id : String(providerOrganization._id);
    }

    // Извлекаем accountNumber из providerOrganization.requisite.accountNumber
    // requisite может быть массивом или одним объектом (IRequisites или расширенный объект)
    let accountNumber: string | undefined;
    if (providerOrganization.requisite) {
      const requisite = providerOrganization.requisite;
      if (Array.isArray(requisite) && requisite.length > 0) {
        // Если массив, берем первый элемент
        const firstRequisite = requisite[0];
        if (firstRequisite && typeof firstRequisite === 'object' && 'accountNumber' in firstRequisite) {
          accountNumber = firstRequisite.accountNumber?.trim() || undefined;
        }
      } else if (typeof requisite === 'object' && requisite !== null) {
        // Если объект, проверяем наличие accountNumber
        if ('accountNumber' in requisite && requisite.accountNumber) {
          accountNumber =
            typeof requisite.accountNumber === 'string'
              ? requisite.accountNumber.trim()
              : String(requisite.accountNumber).trim();
          // Если после trim пустая строка, делаем undefined
          if (accountNumber === '') {
            accountNumber = undefined;
          }
        }
      }
    }

    return {
      providerId,
      providerName: providerOrganization.name?.trim() || undefined,
      accountNumber,
    };
  }

  async buildQueryWithOrganizationAccess(
    baseQuery: Partial<IFormPaymentQuery>,
    accountId: string,
  ): Promise<FilterQuery<FormPayment>> {
    const organizationIds = await this.organizationService.getAccessibleOrganizationIds(accountId);

    // Сначала обрабатываем все параметры через makeQuery (включая createDateGte/createDateLt)
    const query = await this.makeQuery({
      ...baseQuery,
      account: accountId,
    });

    // Если пользователь имеет доступ к каким-то организациям, добавляем их в условие
    if (organizationIds.length > 0) {
      const orConditions: Array<{ account: string } | { 'organization.refOrganizationId': { $in: string[] } }> = [
        { account: accountId },
        { 'organization.refOrganizationId': { $in: organizationIds } },
      ];

      // Используем mergeOrCondition для правильного объединения условий
      this.mergeOrCondition(query, orConditions);
      delete query.account;
    }

    return query;
  }

  async checkFormPaymentAccess(formPaymentId: string, accountId: string): Promise<IFormPayment> {
    // Сначала получаем сделку по ID
    const formPayment = await this.findOne({ _id: formPaymentId });

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
      const hasAccess = await this.organizationService.hasOrganizationAccess(organizationId, accountId);
      if (hasAccess) {
        return formPayment;
      }
    }

    throw new NotFoundException('FormPayment not found.');
  }

  private getOrganizationIdFromForm(organization: IFormPaymentOrganization | string | undefined): string | undefined {
    if (!organization) {
      return undefined;
    }

    if (typeof organization === 'string') {
      return organization;
    }

    return organization.refOrganizationId;
  }

  // VF-2: Отправка поручения на подписание через Diadoc
  async signPaymentOrderViaDiadoc(findData: IFormPaymentQuery, recipientInn: string): Promise<IFormPayment> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const formPaymentModel = await this.findOneOrException({ _id: findData._id }, {
      include: ['account', 'organization'],
    });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    // Проверяем, что метод подписания установлен в 'diadoc'
    if ((formPayment.docs as any)?.paymentOrderSignMethod !== 'diadoc') {
      throw new BadRequestException('Payment order sign method is not set to diadoc. Please set sign method before sending.');
    }

    // Проверяем, что поручение сгенерировано
    if (!formPayment.docs?.paymentOrderDocx && !formPayment.docs?.paymentOrder) {
      throw new BadRequestException('Payment order not generated yet');
    }

    // Проверяем, что поручение еще не отправлено в Diadoc
    const existingDiadocDocId = (formPayment.docs as any)?.paymentOrderDiadocDocumentId;
    if (existingDiadocDocId) {
      throw new BadRequestException('Payment order already sent to Diadoc');
    }

    // Проверяем, что поручение еще не подписано вручную
    if (formPayment.docs?.paymentOrderSigned && formPayment.docs.paymentOrderSigned.length > 0) {
      throw new BadRequestException('Payment order already signed manually');
    }

    // Получаем файл поручения (предпочитаем DOCX, если есть)
    const fileIdValue = formPayment.docs?.paymentOrderDocx || formPayment.docs?.paymentOrder;
    if (!fileIdValue) {
      throw new BadRequestException('Payment order file not found');
    }

    // Преобразуем fileId в string, если это ObjectId или IFile
    const fileId = typeof fileIdValue === 'string' ? fileIdValue : fileIdValue.toString();

    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('Payment order file not found');
    }

    // Получаем buffer файла через FileService
    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: fileId });

    // Получаем ИНН организации получателя (клиента)
    const organizationInn = formPayment.organization?.inn || recipientInn;
    if (!organizationInn) {
      throw new BadRequestException('Organization INN is required for Diadoc signing');
    }

    try {
      // Получаем BoxId получателя для отправки в одном запросе
      const recipientBoxId = await this.diadocService.getBoxIdByInn(organizationInn);
      if (!recipientBoxId) {
        throw new BadRequestException(`Recipient organization not found for INN: ${organizationInn}`);
      }

      // Загружаем и отправляем документ в Diadoc в одном запросе
      const uploadResult = await this.diadocService.uploadDocument(
        fileBuffer,
        file.originalName || `payment-order-${formPayment.uid}.pdf`,
        file.mimeType || 'application/pdf',
        recipientBoxId,
        true, // needRecipientSignature
      );

      const documentId = uploadResult.documentId || uploadResult.messageId;
      const messageId = uploadResult.messageId;

      // Обновляем заявку с информацией о Diadoc
      const updateData: IFormUpdate = {
        docs: {
          ...(formPayment.docs || {}),
          paymentOrderDiadocDocumentId: documentId,
          paymentOrderDiadocMessageId: messageId,
          paymentOrderIsDiadocSigning: true,
          paymentOrderDiadocSentAt: new Date(),
          paymentOrderSignMethod: 'diadoc',
        } as any,
        status: FormPaymentStatus.SIGNING_ORDER,
        prevStatus: formPayment.status,
      };

      const updatedForm = await this.updateOne(findData, updateData);

      // Записываем метрику отправки документа
      if (this.diadocService) {
        this.diadocService.recordDocumentSent('paymentOrder');
      }

      this.logger.log(
        `Payment order sent to Diadoc for signing: formPaymentId=${formPayment._id}, documentId=${documentId}, messageId=${messageId}`,
      );

      // Отправляем уведомления
      await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
        action: SocketMessageAction.UPDATE,
        formPayment: updatedForm,
      });

      return updatedForm;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send payment order to Diadoc: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      // VF-2: Отправка уведомления клиенту об ошибке API Diadoc (сценарий A2)
      try {
        const accountId = typeof formPayment.account === 'string'
          ? formPayment.account
          : (formPayment.account as any)?._id?.toString();

        if (accountId) {
          await this.client.send(SenderPattern.SEND_USER, {
            type: SenderFormPaymentEvents.DIADOC_API_ERROR,
            account: accountId,
            data: { ...formPayment, errorMessage },
            language: 'ru',
          });
        }
      } catch (notificationError) {
        this.logger.warn(`Failed to send error notification: ${notificationError}`);
      }

      throw new BadRequestException(`Failed to send payment order to Diadoc: ${errorMessage}`);
    }
  }

  // VF-2: Отправка отчёта на подписание через Diadoc
  async signReportViaDiadoc(findData: IFormPaymentQuery, recipientInn: string): Promise<IFormPayment> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const formPaymentModel = await this.findOneOrException({ _id: findData._id }, {
      include: ['account', 'organization'],
    });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    // Проверяем, что метод подписания отчёта установлен в 'diadoc'
    if ((formPayment.docs as any)?.reportSignMethod !== 'diadoc') {
      throw new BadRequestException('Report sign method is not set to diadoc. Please set sign method before sending.');
    }

    // Проверяем, что отчёт загружен
    if (!formPayment.docs?.report && !formPayment.docs?.docxFile) {
      throw new BadRequestException('Report not found');
    }

    // Проверяем, что отчёт еще не отправлен в Diadoc
    const existingDiadocDocId = (formPayment.docs as any)?.reportDiadocDocumentId;
    if (existingDiadocDocId) {
      throw new BadRequestException('Report already sent to Diadoc');
    }

    // Проверяем, что отчёт еще не подписан вручную
    if (formPayment.docs?.reportSigned) {
      throw new BadRequestException('Report already signed manually');
    }

    // Получаем файл отчёта (предпочитаем DOCX, если есть)
    const fileIdValue = formPayment.docs?.docxFile || formPayment.docs?.report;
    if (!fileIdValue) {
      throw new BadRequestException('Report file not found');
    }

    // Преобразуем fileId в string, если это ObjectId или IFile
    const fileId = typeof fileIdValue === 'string' ? fileIdValue : fileIdValue.toString();

    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('Report file not found');
    }

    // Получаем buffer файла через FileService
    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: fileId });

    // Получаем ИНН организации получателя (клиента)
    const organizationInn = formPayment.organization?.inn || recipientInn;
    if (!organizationInn) {
      throw new BadRequestException('Organization INN is required for Diadoc signing');
    }

    try {
      // Получаем BoxId получателя для отправки в одном запросе
      const recipientBoxId = await this.diadocService.getBoxIdByInn(organizationInn);
      if (!recipientBoxId) {
        throw new BadRequestException(`Recipient organization not found for INN: ${organizationInn}`);
      }

      // Загружаем и отправляем документ в Diadoc в одном запросе
      const uploadResult = await this.diadocService.uploadDocument(
        fileBuffer,
        file.originalName || `report-${formPayment.uid}.pdf`,
        file.mimeType || 'application/pdf',
        recipientBoxId,
        true, // needRecipientSignature
      );

      const documentId = uploadResult.documentId || uploadResult.messageId;
      const messageId = uploadResult.messageId;

      // VF-2: Обновляем заявку с информацией о Diadoc и устанавливаем промежуточный статус
      const updateData: IFormUpdate = {
        docs: {
          ...(formPayment.docs || {}),
          reportDiadocDocumentId: documentId,
          reportDiadocMessageId: messageId,
          reportIsDiadocSigning: true,
          reportDiadocSentAt: new Date(),
          reportSignMethod: 'diadoc',
        } as any,
        // VF-2: Устанавливаем промежуточный статус "отчёт на подписании в ЭДО"
        status: FormPaymentStatus.REPORT_WAITING_DIADOC,
        prevStatus: formPayment.status,
      };

      const updatedForm = await this.updateOne(findData, updateData);

      // Записываем метрику отправки документа
      if (this.diadocService) {
        this.diadocService.recordDocumentSent('report');
      }

      this.logger.log(
        `Report sent to Diadoc for signing: formPaymentId=${formPayment._id}, documentId=${documentId}, messageId=${messageId}`,
      );

      // Отправляем уведомления
      await this.formPaymentQueue.add(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS, {
        action: SocketMessageAction.UPDATE,
        formPayment: updatedForm,
      });

      return updatedForm;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send report to Diadoc: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      // VF-2: Отправка уведомления клиенту об ошибке API Diadoc (сценарий A2)
      try {
        const accountId = typeof formPayment.account === 'string'
          ? formPayment.account
          : (formPayment.account as any)?._id?.toString();

        if (accountId) {
          await this.client.send(SenderPattern.SEND_USER, {
            type: SenderFormPaymentEvents.DIADOC_API_ERROR,
            account: accountId,
            data: { ...formPayment, errorMessage },
            language: 'ru',
          });
        }
      } catch (notificationError) {
        this.logger.warn(`Failed to send error notification: ${notificationError}`);
      }

      throw new BadRequestException(`Failed to send report to Diadoc: ${errorMessage}`);
    }
  }

  // VF-2: Поиск FormPayment по Diadoc document ID для поручения на оплату
  async findOneByPaymentOrderDiadocDocumentId(documentId: string): Promise<IFormPayment | null> {
    try {
      const formPayment = await this.model.findOne({
        'docs.paymentOrderDiadocDocumentId': documentId,
      } as any);

      return formPayment ? plainModelToClass(FormPaymentWithAccountDto, formPayment) : null;
    } catch (error) {
      this.logger.error(`Failed to find FormPayment by payment order Diadoc document ID: ${error.message}`);
      return null;
    }
  }

  // VF-2: Поиск FormPayment по Diadoc document ID для отчёта
  async findOneByReportDiadocDocumentId(documentId: string): Promise<IFormPayment | null> {
    try {
      const formPayment = await this.model.findOne({
        'docs.reportDiadocDocumentId': documentId,
      } as any);

      return formPayment ? plainModelToClass(FormPaymentWithAccountDto, formPayment) : null;
    } catch (error) {
      this.logger.error(`Failed to find FormPayment by report Diadoc document ID: ${error.message}`);
      return null;
    }
  }

  // VF-2: Установка способа подписи документов
  async setSignMethod(
    findData: IFormPaymentQuery,
    signMethod: { paymentOrderSignMethod?: 'manual' | 'diadoc'; reportSignMethod?: 'manual' | 'diadoc' },
  ): Promise<IFormPayment> {
    const formPaymentModel = await this.findOneOrException({ _id: findData._id }, {
      include: ['docs'],
    });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    // VF-2: Проверка, что нельзя изменить способ подписи после отправки в ЭДО
    if (signMethod.paymentOrderSignMethod !== undefined) {
      const existingPaymentOrderDiadocDocId = (formPayment.docs as any)?.paymentOrderDiadocDocumentId;
      if (existingPaymentOrderDiadocDocId) {
        throw new BadRequestException('Cannot change payment order sign method after document is sent to Diadoc');
      }
    }

    if (signMethod.reportSignMethod !== undefined) {
      const existingReportDiadocDocId = (formPayment.docs as any)?.reportDiadocDocumentId;
      if (existingReportDiadocDocId) {
        throw new BadRequestException('Cannot change report sign method after document is sent to Diadoc');
      }
    }

    // Формируем объект обновления
    const docsUpdate: any = {
      ...(formPayment.docs || {}),
    };

    if (signMethod.paymentOrderSignMethod !== undefined) {
      docsUpdate.paymentOrderSignMethod = signMethod.paymentOrderSignMethod;
    }

    if (signMethod.reportSignMethod !== undefined) {
      docsUpdate.reportSignMethod = signMethod.reportSignMethod;
    }

    // Обновляем заявку
    const updateData: IFormUpdate = {
      docs: docsUpdate,
    };

    const updatedForm = await this.updateOne(findData, updateData);

    this.logger.log(
      `Sign method updated for formPaymentId=${formPayment._id}: ` +
      `paymentOrderSignMethod=${signMethod.paymentOrderSignMethod || 'unchanged'}, ` +
      `reportSignMethod=${signMethod.reportSignMethod || 'unchanged'}`,
    );

    return updatedForm;
  }
}
