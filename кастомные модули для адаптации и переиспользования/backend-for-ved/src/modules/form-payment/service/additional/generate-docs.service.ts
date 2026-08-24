import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import { renderFile } from 'pug';
import moment from 'moment/moment';
import * as path from 'path';

import { IFormPaymentQuery, IFormPaymentService, IFormUpdate } from '../form-payment.service.interface';
import { IFormPayment, IFormPaymentOrganization } from 'lib/interfaces/models/form-payment.interface';
import { FormPayment } from '../form-payment.schema';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentStatus,
  PlatformPostpayMode,
} from 'lib/enums/models/form-payment.enums';
import { getIdFromAccount, plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { FORM_PAYMENT_SERVICE } from 'modules/form-payment/form-payment.constants';
import { IFile } from 'lib/interfaces/models/file.interface';
import { FormPaymentWithAccountDto } from 'lib/dto/models/form-payment.dto';
import { ContractPattern, ContractStatus } from 'lib/enums/models/contract.enums';
import { IContract } from 'lib/interfaces/models/contract.interface';
import { AllCurrencies } from 'lib/enums/common.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { IIdField } from 'lib/interfaces/id-field.interface';
import { IAgent } from 'lib/interfaces/models/agent.interface';
import { TextUtilsHelper } from 'lib/utils/helpers/text-utils.helper';
import { IGenerateAgentReport, IGenerateDocsService, IGenerateOrder } from './generate-docs.service.interface';
import { DOCX_FILES } from 'lib/docx/enums';
import { PetrovichCaseType } from 'lib/enums/petrovich.enums';
import { formatNumber } from 'lib/utils/helpers/number-format-utils';
import { Case } from 'russian-nouns-js';
import { formatDate } from 'lib/utils/helpers/date.helpers';
import { getSigningOrderFeePaymentText } from 'lib/utils/helpers/signing-order-text.helper';
import { InjectNats, NatsClientProxy } from '../../../../lib/modules/nats/nats-client-proxy';
import { FilePattern } from '../../../../lib/enums/models/file.enums';
import { PassThrough } from 'stream';
import { IBaseOptions } from '../../../../lib/services/base/base.service.interface';
import { generateXlsxFile } from '../../../../lib/xlsx/generators';
import { XLSX_FILES } from '../../../../lib/xlsx/enums';
import * as _ from 'lodash';
import { IOrganization } from '../../../../lib/interfaces/models/organization.interface';
import { IFileService, ICreateDocument, ICreateDocumentDocx } from '../../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../../file/file.constants';
import { IContractService } from '../../../contract/service/contract.service.interface';
import { AgentPattern } from 'lib/enums/models/agent.enums';
import { AccountPattern } from 'lib/enums/models/account.enums';

@Injectable()
export class GenerateDocsService implements IGenerateDocsService {
  private readonly logger: Logger = new Logger(GenerateDocsService.name);

  constructor(
    @InjectModel(FormPayment.name) readonly model: PaginateModel<FormPayment>,
    @Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    @Inject('IContractService') private readonly contractService: IContractService,
    @InjectNats() readonly client: NatsClientProxy,
  ) {}

  async generateOrder(data: IGenerateOrder & IIdField) {
    const formPaymentModel = await this.service.findOneOrExceptionForOrder({ _id: data._id }, { include: ['account'] });
    const formPayment = plainModelToClass(FormPaymentWithAccountDto, formPaymentModel);

    const agent = data.agent || formPayment.agent;

    const agentData = await this.client.send(AgentPattern.FIND_ONE_OR_EXCEPTION, {
      query: {
        _id: agent,
      },
    });

    const contract = await this.client.send<IContract>(ContractPattern.FIND_ONE, {
      query: {
        organization: formPayment.organization._id,
        agent: agentData._id.toString(),
        status: ContractStatus.ACCEPTED,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contract not found.');
    }

    if (
      formPayment.direction === FormPaymentDirection.IMPORT &&
      formPayment.platformPaymentCondition === FormPaymentCondition.ADVANCE
    ) {
      if (
        !_.isNumber(formPayment.totals.coverAmount) ||
        (!_.isNumber(formPayment.totals.feePercent) && !_.isNumber(formPayment.totals.feeFix))
      ) {
        throw new BadRequestException('CoverAmount and feePercent must be exists.');
      }
    }

    const isRateOnProviderPostpay =
      formPayment.platformPaymentCondition === FormPaymentCondition.POST_PAYMENT &&
      formPayment.platformPostpayMode === PlatformPostpayMode.POSTPAY_RATE_ON_PP;

    // Rate-on-provider postpay (postpay_rate_on_pp):
    // - primary order must not include rate/cover/fee amount (only nominal payment + fee terms),
    // - supplementary (advance) order includes fixed amounts once rate is fixed after provider payment.
    const isAdvanceOrder = data.isAdvance === true;
    const includeFixedAmounts = !isRateOnProviderPostpay || isAdvanceOrder;

    if (isRateOnProviderPostpay && isAdvanceOrder) {
      if (
        !_.isNumber(formPayment.currency?.rate) ||
        !_.isNumber(formPayment.totals.coverAmount) ||
        !_.isNumber(formPayment.totals.feeAmount)
      ) {
        throw new BadRequestException(
          'Supplementary order for rate-on-provider postpay requires fixed rate and calculated totals.',
        );
      }
    }

    // TODO продумать при каких статусах не формирвать поручение
    const getCurrencyIcon = (currency: AllCurrencies) => {
      switch (currency) {
        case AllCurrencies.RUB:
          return '₽';
        case AllCurrencies.CNY:
          return '¥';
        case AllCurrencies.JPY:
          return '¥';
        case AllCurrencies.TRY:
          return '₺';
        case AllCurrencies.USD:
          return '$';
        case AllCurrencies.HKD:
          return 'HK$';
        case AllCurrencies.INR:
          return '₹';
        case AllCurrencies.AED:
          return AllCurrencies.AED;
        case AllCurrencies.EUR:
          return '€';
        case AllCurrencies.CAD:
          return 'C$';
        case AllCurrencies.SGD:
          return 'S$';
        case AllCurrencies.GBP:
          return '£';
        // case AllCurrencies.KZT:
        //   return '₸';
        case AllCurrencies.BTC:
          return '₿';
        case AllCurrencies.ETH:
          return 'Ξ';
        case AllCurrencies.USDT:
          return '₮';
      }
    };

    const orderDate = moment();

    const accountFeePercent =
      typeof formPayment.account === 'object' ? (formPayment.account as IAccount).feePercent : undefined;
    let feePercentMinor: number | null = null;
    if (_.isNumber(formPayment.totals?.feePercent)) {
      feePercentMinor = formPayment.totals.feePercent;
    } else if (_.isNumber(accountFeePercent)) {
      feePercentMinor = accountFeePercent;
    }

    const feeAmount = includeFixedAmounts ? formatNumber(formPayment.totals.feeAmount) : null;
    const feePaymentText = feeAmount
      ? getSigningOrderFeePaymentText({
          feeAmount,
          platformPaymentCondition: formPayment.platformPaymentCondition,
          isAdvanceOrder,
        })
      : null;

    const legacyFixedFeeMinor =
      _.isNumber(formPayment.totals?.feeFix) && formPayment.totals.feeFix > 0 ? formPayment.totals.feeFix : null;
    const coverFixedFeeMinor =
      _.isNumber(formPayment.totals?.feeFixCover) && formPayment.totals.feeFixCover > 0
        ? formPayment.totals.feeFixCover
        : null;

    let fixedFeeMinor: number | null = null;
    let fixedFeeCurrency: AllCurrencies | null = null;
    let fixedFeeRate: number | null = null;

    if (legacyFixedFeeMinor !== null) {
      fixedFeeMinor = legacyFixedFeeMinor;
      fixedFeeCurrency = formPayment.currency.fixFeeCurrency ?? formPayment.currency.client;

      const shouldIncludeFixedFeeRate =
        fixedFeeCurrency !== formPayment.currency.client && typeof formPayment.currency.fixFeeRate === 'number';
      if (shouldIncludeFixedFeeRate) {
        fixedFeeRate = parseFloat(formPayment.currency.fixFeeRate.toFixed(4));
      }
    } else if (coverFixedFeeMinor !== null) {
      fixedFeeMinor = coverFixedFeeMinor;
      fixedFeeCurrency = formPayment.currency.client;
    }

    const orderData = {
      orderNumber: formPayment.uid, // заменяем formPayment.invoice.contractNumber
      orderDate: formatDate(orderDate), // Используем текущую дату,
      clientOrganizationBusinessForm: formPayment.organization?.businessForm, // форма организации
      clientOrganizationName: data.clientOrganization || formPayment.organization?.name || 'n/a', // введенное или из заявки
      clientSignerName: formPayment.organization?.signerName || 'n/a', // введенное или из заявки
      agentOrganizationName: agentData.organizationName, // подставляем только название
      agentContractNumber: contract.number,
      agentContractDate: formatDate(contract.date),
      counterpartyName: formPayment.counterparty.name,
      invoiceNumber: formPayment.invoices?.[0]?.invoiceNumber,
      invoiceDate: formatDate(formPayment.invoices?.[0]?.invoiceDate),
      counterpartyCurrencyIcon: getCurrencyIcon(formPayment.currency.counterparty),
      amount: formatNumber(formPayment.totals.amount),
      counterpartyCurrency: formPayment.currency.counterparty,
      bankName: formPayment.counterparty.bankName,
      swiftCode: formPayment.counterparty.swiftCode,
      accountNumber: formPayment.counterparty.accountNumber,
      currencyRate: includeFixedAmounts
        ? typeof formPayment.currency.rate === 'number'
          ? parseFloat(formPayment.currency.rate.toFixed(4))
          : null
        : null,
      currencyFeeRate: includeFixedAmounts ? fixedFeeRate : null,
      feePercent: _.isNumber(feePercentMinor) ? feePercentMinor / 100 : null,
      feeFix: fixedFeeMinor !== null ? fixedFeeMinor / 100 : null,
      coverAmount: includeFixedAmounts ? formatNumber(formPayment.totals.coverAmount) : null,
      clientCurrencyIcon: getCurrencyIcon(formPayment.currency.client),
      clientCurrency: formPayment.currency.client,
      feeFixCurrency: fixedFeeCurrency,
      feeAmount,
      feePaymentText,
      platformPaymentCondition: formPayment.platformPaymentCondition,
      isAdvanceOrder,
      isImport: formPayment.direction === FormPaymentDirection.IMPORT,
    };

    // feeFixCurrency - валюта фикс комс
    // feeFix - фикс комс
    // + currencyFeeRate - курс фикс комс

    const htmlString = renderFile(path.join(__dirname, '../../templates/', 'order.pug'), orderData);

    try {
      const orderPdf = await this.client.send<IFile>(FilePattern.CREATE_PDF, {
        text: htmlString,
      });
      const orderDocx = await this.client.send<IFile>(FilePattern.CREATE_DOCX, {
        name: DOCX_FILES.SIGNING_ORDER,
        data: orderData,
      });

      const updateData: IFormUpdate = {
        clientOrganization: data.clientOrganization, // из аккаунта или вводить
        organizationName: data.organizationName, // подставляем только название
        signer: data.signer,
      };

      // TODO Надо удалить, поле organizationName у клиента больше не используется
      // сохранить название организации клиента
      await this.client.send(AccountPattern.UPDATE_ONE, {
        query: {
          _id: getIdFromAccount(formPayment.account),
        },
        update: { organizationName: data.clientOrganization },
      });

      if (isAdvanceOrder) {
        updateData.paymentAdvanceOrder = orderPdf._id;
        updateData.paymentAdvanceOrderDocx = orderDocx._id;
        updateData.advanceSigningOrderCreateDate = orderDate.toDate();
      } else {
        updateData.paymentOrder = orderPdf._id;
        updateData.paymentOrderDocx = orderDocx._id;
        updateData.signingOrderCreateDate = orderDate.toDate();
      }

      return this.service.updateOne({ _id: formPayment._id }, updateData);
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
      throw new InternalServerErrorException(null, 'Can not create order.');
    }
  }

  protected async makeQuery({
    _ids,
    statuses,
    sentDateGte,
    sentDateLte,
    ...findData
  }: IFormPaymentQuery & {
    _ids?: string[];
    statuses?: FormPaymentStatus[];
    sentDateGte?: Date;
    sentDateLte?: Date;
  }): Promise<FilterQuery<FormPayment>> {
    const query: FilterQuery<FormPayment> = { ...findData };

    if (_ids) {
      query._id = { $in: _ids };
    }

    if (statuses?.length) {
      query.status = { $in: statuses };
    }

    if (sentDateGte) {
      query.sentDate = { $gte: sentDateGte };
    }

    if (sentDateLte) {
      query.sentDate = { ...query.sentDate, $lte: sentDateLte };
    }

    return query;
  }

  async generateAgentReport(findData: IFormPaymentQuery, data: IGenerateAgentReport): Promise<IFormPayment> {
    const { account, ...findDataWithoutAccount } = findData;

    let contract: IContract | null = null;

    const formPayment = await this.service.findOneOrException(findDataWithoutAccount, {
      include: ['account', 'agent', 'docs'],
    });

    try {
      if (!formPayment.agent) {
        throw new BadRequestException('Agent is either missing or not loaded properly');
      }

      // Получаем base64 для подписи и печати
      let signatureBase64 = '';
      let stampBase64 = '';

      const agent = formPayment.agent as IAgent;

      if (agent?.signatures) {
        const signatureId = typeof agent.signatures === 'string' ? agent.signatures : agent.signatures._id?.toString();
        if (signatureId) {
          const signatureFile = await this.fileService.getFileString({
            _id: signatureId,
          });
          signatureBase64 = signatureFile?.content || '';
        }
      }

      if (agent?.stamp) {
        const stampId = typeof agent.stamp === 'string' ? agent.stamp : agent.stamp._id?.toString();
        if (stampId) {
          const stampFile = await this.fileService.getFileString({
            _id: stampId,
          });
          stampBase64 = stampFile?.content || '';
        }
      }

      if ('_id' in (formPayment.account as IAccount)) {
        contract = await this.contractService.findOne({
          organization: (formPayment.organization as IOrganization)._id,
          agent: agent._id,
          status: ContractStatus.ACCEPTED,
        });

        if (!contract) {
          throw new BadRequestException('Contract not found');
        }
      }

      if (
        !_.isNumber(formPayment.totals.coverAmount) ||
        (!_.isNumber(formPayment.totals.feePercent) && !_.isNumber(formPayment.totals.feeFix))
      ) {
        throw new BadRequestException('CoverAmount and feePercent must exist');
      }

      // Используем имя и ФИО директора
      const agentFullName = agent?.director?.name || '';
      const principalFullName =
        (formPayment.organization as IFormPaymentOrganization)?.signerName || formPayment.signer || '';

      const agentNameGenitive = TextUtilsHelper.formatFullName(agentFullName, PetrovichCaseType.GENITIVE);
      const principalNameGenitive = TextUtilsHelper.formatFullName(principalFullName, PetrovichCaseType.GENITIVE);
      const agentNameDative = TextUtilsHelper.formatFullName(agentFullName, PetrovichCaseType.DATIVE);
      const principalNameDative = TextUtilsHelper.formatFullName(principalFullName, PetrovichCaseType.DATIVE);

      const counterpartyCurrency = formPayment.currency?.counterparty;
      const clientCurrency = formPayment.currency?.client || undefined;

      const amount = formPayment.totals?.amount || 0;
      const convertedAmount = formPayment.totals?.coverAmount || 0;

      const paymentNumber = data.paymentOrderNumber;
      const paymentDate = data.paymentOrderDate;

      const reportData = {
        reportNumber: `${formPayment.uid}/AR`,
        date: formatDate(moment()),
        paymentNumber,
        paymentDate: moment(paymentDate).format('DD.MM.YYYY'),

        contractInfo: {
          number: contract.number || '', // используем номер из contract или дефолтное значение
          date: moment(contract.date || moment()).format('DD.MM.YYYY'), // используем дату из contract или дефолтную
        },

        // Данные компаний
        agentCompany: agent.organizationName,
        principalCompany: formPayment.clientOrganization || '(не указано)',

        // Данные руководителей в разных падежах
        agentPosition: 'Директор',
        agentPositionGenitive: TextUtilsHelper.declineText('Директор', Case.GENITIVE),
        agentName: agentFullName,
        agentNameGenitive,
        agentNameDative,
        principalPosition: 'Генеральный директор',
        principalPositionGenitive: TextUtilsHelper.declineText('Генеральный директор', Case.GENITIVE),
        principalName: principalFullName,
        principalNameGenitive,
        principalNameDative,
        principalBasis: 'Устава',

        invoiceNumber: formPayment.invoices?.[0]?.invoiceNumber,
        invoiceDate: formatDate(formPayment.invoices?.[0]?.invoiceDate),

        // Добавляем пути к файлам подписи и печати
        agentSignatureBase64Full: signatureBase64 ? `data:image/png;base64,${signatureBase64}` : '',
        agentSignatureBase64: signatureBase64,
        agentStampBase64Full: stampBase64 ? `data:image/png;base64,${stampBase64}` : '',
        agentStampBase64: stampBase64,

        // Данные платежа
        orderNumber: formPayment.uid,
        orderDate: formPayment.signingOrderCreateDate
          ? moment(formPayment.signingOrderCreateDate).format('DD.MM.YYYY')
          : 'n/a',
        beneficiaryName: formPayment.counterparty?.name || '(не указано)',

        amount: formatNumber(amount),
        amountInWords: TextUtilsHelper.moneyToWords({
          value: amount,
          currency: counterpartyCurrency,
        }),
        currency: counterpartyCurrency ? counterpartyCurrency.toUpperCase() : 'не указано',

        convertedAmount: formatNumber(convertedAmount),
        convertedAmountInWords: TextUtilsHelper.moneyToWords({
          value: convertedAmount,
          currency: clientCurrency,
        }),
        convertedCurrency: clientCurrency ? clientCurrency.toUpperCase() : 'не указано',
        rate: typeof formPayment.currency?.rate === 'number' ? parseFloat(formPayment.currency.rate.toFixed(4)) : null,
        commissionPercent: formPayment.totals?.feePercent ? formPayment.totals.feePercent / 100 : 0,
        commissionAmount: formPayment.totals?.feeAmount ? formatNumber(formPayment.totals?.feeAmount) : 0,

        currencyFeeRate:
          typeof formPayment.currency.fixFeeRate === 'number'
            ? parseFloat(formPayment.currency.fixFeeRate.toFixed(4))
            : null,
        feeFix: formPayment.totals.feeFix ? formPayment.totals.feeFix / 100 : null,
        feeFixCurrency: formPayment.currency.fixFeeCurrency,
      };

      const text = renderFile(path.join(__dirname, '../../templates/agent-report.pug'), reportData);

      // Генерируем PDF и DOCX файлы
      const accountId = typeof account === 'string' ? account : account?.toString();
      const pdfData: ICreateDocument = {
        text,
        filename: `agent-report-${formPayment.uid}.pdf`,
        account: accountId,
        private: false,
      };
      const docxData: ICreateDocumentDocx = {
        name: DOCX_FILES.AGENT_REPORT,
        data: reportData,
        filename: `agent-report-${formPayment.uid}.docx`,
        account: accountId,
        private: false,
      };

      const [pdfFile, docxFile] = await Promise.all([
        this.fileService.createPdf(pdfData),
        this.fileService.createDocx(docxData),
      ]);

      const updatedForm = await this.service.updateOne(
        { _id: formPayment._id },
        {
          report: pdfFile._id,
          docxFile: docxFile._id,
        },
      );

      this.logger.log(`Generated agent report for form ${formPayment.uid}`);
      return updatedForm;
    } catch (error) {
      this.logger.error('Failed to generate agent report:', {
        error: error,
        stack: error.stack,
        message: error.message,
        formPayment: {
          uid: formPayment.uid,
          agent: formPayment.agent,
          signer: formPayment.signer,
        },
      });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate agent report');
    }
  }

  async generateFormPayments(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<PassThrough> {
    const formPayments = [];

    const cursor = await this.service.findCursor(findData, options);

    await cursor.eachAsync(
      (batch) => {
        formPayments.push(...batch);
      },
      { batchSize: 100 },
    );

    const workBook = generateXlsxFile(XLSX_FILES.FORM_PAYMENTS, formPayments);

    const stream = new PassThrough();

    await workBook.xlsx.write(stream);

    return stream;
  }
}
