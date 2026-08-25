import { Inject, Injectable, Logger } from '@nestjs/common';
import { IRecognitionService, IRecognizePdfOptions, IRecognizePdfResult } from './recognition.service.interface';
import { IOcrService, OCR_SERVICE } from '../../../lib/services/ocr/ocr.service.interface';
import { ANTHROPIC_SERVICE, IAnthropicService } from '../../../lib/services/anthropic/anthropic.service.interface';
import { ConfigService } from '@nestjs/config';
import { sleep } from '../../../lib/utils/sleep';
import * as _ from 'lodash';
import { IFormPayment, IFormRecognized } from '../../../lib/interfaces/models/form-payment.interface';
import { IFormUpdate } from '../../form-payment/service/form-payment.service.interface';
import { FormPaymentKind, FormPaymentPattern, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { FilePattern } from '../../../lib/enums/models/file.enums';
import { fromBuffer } from 'pdf2pic';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { getIdFromAccount } from '../../../lib/utils/helpers/entity.helper';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { IFileString, IFileService } from '../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../file/file.constants';

type InvoiceRecognizedFields = Partial<{
  contractNumber: string;
  contractDate: Date;
  invoiceNumber: string;
  invoiceDate: Date;
}>;

interface InvoiceRecognizedData extends InvoiceRecognizedFields {
  recognized: IFormRecognized;
}

type AnthropicInvoiceExtraction = Partial<
  Record<
    | 'swiftCode'
    | 'bankName'
    | 'bankCountry'
    | 'bankAddress'
    | 'companyName'
    | 'companyAddress'
    | 'bankAccount'
    | 'contractNumber'
    | 'contractDate'
    | 'invoiceNumber'
    | 'invoiceDate',
    string
  >
> & {
  hsCodes?: unknown;
  hsCode?: unknown;
};

interface PaymentAnthropicResponse {
  paymentNumber?: string;
  paymentDate?: string;
}

@Injectable()
export class RecognitionService implements IRecognitionService {
  private readonly logger: Logger = new Logger(RecognitionService.name);

  constructor(
    @InjectNats() readonly client: NatsClientProxy,
    @Inject(OCR_SERVICE) protected readonly ocrService: IOcrService,
    @Inject(ANTHROPIC_SERVICE) private readonly anthropicService: IAnthropicService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    private readonly configService: ConfigService,
  ) {}

  async recognizeFormInvoices(form: IFormPayment): Promise<void> {
    const updateData: IFormUpdate = {
      status: FormPaymentStatus.DRAFT,
      prevStatus: FormPaymentStatus.CREATING,
      invoices: form.invoices,
    };

    let invoice = _.head(form.invoices);
    if (!invoice) {
      this.logger.warn(`[Recognition] No invoices found for form ${form._id}`);
      return;
    }

    let recognizeResult: IRecognizePdfResult<string[], InvoiceRecognizedData> | undefined;
    let recognizeLines: string[] = [];

    if (_.isString(invoice.file)) {
      let contentResult: IFileString | undefined;

      try {
        contentResult = await this.fileService.getFileString({
          _id: invoice.file as string,
        });
      } catch (error) {
        this.logger.error('[FIND_ONE_FILE_STRING] Ошибка при получении файла:', error);
      }

      if (contentResult) {
        const fileBuffer = Buffer.from(contentResult.content, 'base64');
        const fileContent = contentResult.content;

        let images: Buffer[] | undefined;
        try {
          images = await this.convertPdfToImg(fileBuffer);
        } catch (error) {
          this.logger.error('[convertPdfToImg] Ошибка при конвертации PDF в изображения:', error);
        }

        if (images) {
          try {
            recognizeResult = await this.recognizePdf<string[], InvoiceRecognizedData>(fileContent, images, {
              anthropicRequest: `проанализируй файл инвойса и выпиши из него данные, относящиеся к полям ниже. если поле отсутствует в инвойсе - попробуй найти его в swift или supporting документах. каждая переменная должна быть строкой, кроме массива hsCodes. если банков указан несколько - выбери первый

1. invoice number
2. invoice date - формат даты ISO
3. contract number
4. contract date - формат даты ISO
5. swift code
6. bank name
7. bank address
8. bank country - буквенный код страны
9. bank account
10. company name
11. company address
12. hsCodes - массив всех найденных кодов ТН ВЭД. каждый элемент массива должен содержать только цифры без пробелов. если кодов нет, верни пустой массив

переменные создавать в формате camelCase
ответом должен быть только json
ответом должен быть массив объектов json { "result": [] }`,
              onYandexRecognize: (lines) => {
                return _.reject(lines, (line) => line.replace(/[^a-z а-я]|[ ]/gi, '').length < 2);
              },
              onAnthropicRecognize: (data) => this.reduceInvoiceAnthropicResponse(data),
            });

            recognizeLines = recognizeResult?.yandex ?? [];
          } catch (error) {
            this.logger.error('[recognizePdf] Ошибка при распознавании PDF:', error);
          }
        }
      }
    }

    const anthropicRecognized = recognizeResult?.anthropic ?? this.getInitialInvoiceRecognizedData();

    invoice = {
      ...invoice,
      ...anthropicRecognized,
      recognizeLines,
    };

    updateData.invoices[0] = { ...updateData.invoices[0], ...invoice };

    await this.client.send<void>(FormPaymentPattern.UPDATE_ONE, {
      query: {
        _id: form._id,
      },
      update: updateData,
    });
  }

  private parseRecognizeResponse(
    data: AnthropicInvoiceExtraction,
    initData: InvoiceRecognizedData,
  ): InvoiceRecognizedData {
    const result: InvoiceRecognizedData = {
      ...initData,
      recognized: {
        ...initData.recognized,
        counterparty: {
          ...(initData.recognized.counterparty ?? {}),
        },
      },
    };

    const counterparty = result.recognized.counterparty ?? {};
    result.recognized.counterparty = counterparty;

    if (data.swiftCode) {
      counterparty.swiftCode = data.swiftCode;
    }

    if (data.bankName) {
      counterparty.bankName = data.bankName;
    }

    if (data.bankCountry) {
      counterparty.bankCountry = data.bankCountry;
    }

    if (data.bankAddress) {
      counterparty.bankAddress = data.bankAddress;
    }

    if (data.companyName) {
      counterparty.name = data.companyName;
    }

    if (data.companyAddress) {
      counterparty.address = data.companyAddress;
    }

    if (data.bankAccount) {
      counterparty.accountNumber = data.bankAccount;
    }

    if (data.contractNumber) {
      result.contractNumber = data.contractNumber;
    }

    if (data.contractDate) {
      const parsedContractDate = this.toDate(data.contractDate);
      if (parsedContractDate) {
        result.contractDate = parsedContractDate;
      }
    }

    if (data.invoiceNumber) {
      result.invoiceNumber = data.invoiceNumber;
    }

    if (data.invoiceDate) {
      const parsedInvoiceDate = this.toDate(data.invoiceDate);
      if (parsedInvoiceDate) {
        result.invoiceDate = parsedInvoiceDate;
      }
    }

    const normalizedHsCodes = this.sanitizeHsCodes(data.hsCodes ?? data.hsCode);

    if (normalizedHsCodes.length > 0) {
      const mergedHsCodes = _.uniq([...(result.recognized.hsCodes ?? []), ...normalizedHsCodes]);
      result.recognized.hsCodes = mergedHsCodes;
      if (mergedHsCodes.length > 0) {
        result.recognized.kind = FormPaymentKind.GOOD;
      }
    }

    return result;
  }

  private reduceInvoiceAnthropicResponse(data: unknown[]): InvoiceRecognizedData {
    return data.reduce<InvoiceRecognizedData>((acc, element) => {
      if (!this.isAnthropicInvoiceExtraction(element)) {
        return acc;
      }

      return this.parseRecognizeResponse(element, acc);
    }, this.getInitialInvoiceRecognizedData());
  }

  private getInitialInvoiceRecognizedData(): InvoiceRecognizedData {
    return {
      recognized: {
        counterparty: {},
      },
    };
  }

  private isAnthropicInvoiceExtraction(value: unknown): value is AnthropicInvoiceExtraction {
    return typeof value === 'object' && value !== null;
  }

  private isPaymentAnthropicResponse(value: unknown): value is PaymentAnthropicResponse {
    return typeof value === 'object' && value !== null;
  }

  private hasCodeProperty(value: unknown): value is { code?: unknown } {
    return typeof value === 'object' && value !== null && 'code' in value;
  }

  private sanitizeHsCodes(source: unknown): string[] {
    if (source === undefined || source === null) {
      return [];
    }

    const rawValues: string[] = [];

    const pushValue = (value: unknown): void => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          rawValues.push(trimmed);
        }
        return;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        rawValues.push(String(value));
      }
    };

    const handleValue = (value: unknown): void => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(handleValue);
        return;
      }

      if (this.hasCodeProperty(value)) {
        pushValue(value.code);
        return;
      }

      if (typeof value === 'string') {
        value
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .forEach((item) => pushValue(item));
        return;
      }

      pushValue(value);
    };

    handleValue(source);

    return _.chain(rawValues)
      .map((code) => code.replace(/[^\d]/g, ''))
      .map((code) => code.trim())
      .filter((code) => code.length > 0)
      .uniq()
      .value();
  }

  private toDate(value: string | Date | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed;
  }

  async recognizeFormPayment(form: IFormPayment): Promise<void> {
    const payments: Array<string | IFile> = form.docs?.payments;
    if (!payments?.length || !form.provider) {
      return;
    }

    const providerPaymentFiles = payments.filter((payment) => {
      return typeof payment !== 'string' && getIdFromAccount(payment.account) === getIdFromAccount(form.provider);
    }) as any as IFile[];
    const paymentIds = payments.filter((payment) => typeof payment === 'string') as any as string[];

    if (paymentIds.length) {
      const files = await this.client.send<IFile[]>(FilePattern.FIND_MANY, {
        _ids: paymentIds,
        account: getIdFromAccount(form.provider),
      });
      providerPaymentFiles.push(...files);
    }

    const lastPayment = _.orderBy(providerPaymentFiles, 'createDate', 'desc')[0];

    if (!lastPayment) {
      return;
    }

    const contentResult = await this.fileService.getFileString({
      _id: form.invoices[0].file as string,
    });

    const fileBuffer = Buffer.from(contentResult.content, 'base64');

    const fileContent = contentResult.content;

    const images = await this.convertPdfToImg(fileBuffer);

    const recognizeResult = await this.recognizePdf<undefined, PaymentAnthropicResponse>(fileContent, images, {
      anthropicRequest:
        'проанализируй файл оплаты и выпиши из него данные, относящиеся к полям ниже \n\n1. paymentNumber - это номер платежа, поле может называться transaction id, transfer id, transfer ref\n\n2. paymentDate - дата выполнения платежа, преобразуй в формат ISO, поле может называться transfer date, transaction date, creation date\n\nпеременные создавать в формате camelCase\nответом должен быть только json\n\nответом должен быть массив объектов json {result: []}',
      onAnthropicRecognize: (data) => {
        const candidate = data?.[0];
        if (this.isPaymentAnthropicResponse(candidate)) {
          return candidate;
        }
        return {};
      },
    });

    const updateData: IFormUpdate = {
      paymentRecognized: {},
    };

    if (recognizeResult.anthropic?.paymentNumber) {
      updateData.paymentRecognized.paymentNumber = recognizeResult.anthropic.paymentNumber;
    }
    if (recognizeResult.anthropic?.paymentDate) {
      const paymentDate = this.toDate(recognizeResult.anthropic.paymentDate);
      if (paymentDate) {
        updateData.paymentRecognized.paymentDate = paymentDate;
      }
    }

    await this.client.send<void>(FormPaymentPattern.UPDATE_ONE, {
      query: {
        _id: form._id,
      },
      update: updateData,
    });
  }

  private async recognizePdf<Y, A>(
    fileString: string,
    images: Buffer[],
    options: IRecognizePdfOptions<Y, A>,
  ): Promise<IRecognizePdfResult<Y, A>> {
    const result: IRecognizePdfResult<Y, A> = {};

    let yandexFinish = !this.ocrService.isAvailable;
    let nodulFinish = !this.configService.get('recognize.nodul.isActive');
    let anthropicFinish = !this.configService.get('recognize.anthropic.isActive');

    if (this.ocrService.isAvailable) {
      this.recognizeYandexOcr(fileString)
        .then((lines) => {
          if (options.onYandexRecognize) {
            result.yandex = options.onYandexRecognize(lines);
          }

          yandexFinish = true;
        })
        .catch((err) => {
          this.logger.error(JSON.stringify(err.response?.data || err.message || err));

          yandexFinish = true;
        });
    }

    if (this.configService.get('recognize.anthropic.isActive')) {
      this.recognizeAnthropic(images, options.anthropicRequest)
        .then((data) => {
          if (options.onAnthropicRecognize) {
            result.anthropic = options.onAnthropicRecognize(data);
          }

          anthropicFinish = true;
        })
        .catch((err) => {
          this.logger.error(JSON.stringify(err.response?.data || err.message || err));

          anthropicFinish = true;
        });
    }

    while (!yandexFinish || !nodulFinish || !anthropicFinish) {
      await sleep(1000);
    }

    return result;
  }

  private async recognizeYandexOcr(invoiceFileString: string): Promise<any[]> {
    const lines = [];

    try {
      const data = {
        mimeType: 'application/pdf',
        languageCodes: ['*'],
        model: 'page',
        content: invoiceFileString,
      };

      const operation = await this.ocrService.recognizeTextAsync(data);

      if (operation?.id) {
        const recognition = await this.ocrService.tryGetRecognition(operation.id);

        if (recognition) {
          lines.push(...this.ocrService.parseRecognition(recognition));
        }
      }
    } catch (e) {
      this.logger.error(JSON.stringify(e.response?.data || e.message || e));
    }

    return lines;
  }

  private async recognizeAnthropic(convertedImages: Buffer[], anthropicRequest: string): Promise<unknown[]> {
    this.logger.log('Start anthropic recognize');

    const imageMessages = _.map(convertedImages, (image) => {
      return this.anthropicService.getImageBlockParam(image, {
        mediaType: 'image/png',
      });
    });

    const textMessage = this.anthropicService.getTextBlockParam(anthropicRequest);
    const result: unknown[] = [];
    let rawResponse: string | undefined;

    try {
      const block = await this.anthropicService.prompt([...imageMessages, textMessage]);
      rawResponse = block?.text;

      if (!block?.text) {
        this.logger.warn('[Anthropic] No text in response block');
        return result;
      }

      let cleanText = block.text.trim();

      const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanText = jsonMatch[1].trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText
          .replace(/```\w*\n?/g, '')
          .replace(/```$/g, '')
          .trim();
      }

      const jsonResult = JSON.parse(cleanText);

      if (jsonResult?.result && Array.isArray(jsonResult.result)) {
        result.push(...jsonResult.result);
      } else if (Array.isArray(jsonResult)) {
        result.push(...jsonResult);
      } else {
        this.logger.warn(
          `[Anthropic] Unexpected JSON structure, expected {result: []} or [], got: ${JSON.stringify(
            jsonResult,
          ).substring(0, 200)}`,
        );
      }
    } catch (parseError) {
      this.logger.error(`[Anthropic] JSON parse failed: ${parseError.message}`);
      this.logger.error(`[Anthropic] Raw response preview: ${rawResponse?.substring(0, 500) || 'N/A'}`);
    }

    this.logger.log(`[Anthropic] Finish recognize with ${result.length} extracted items`);
    return result;
  }

  private async convertPdfToImg(fileBuffer: Buffer, imageType: 'image' | 'buffer' | 'base64' = 'buffer') {
    const images = [];

    try {
      this.logger.log('Start convert pdf to img');

      const baseOptions = {
        width: 1550,
        height: 2300,
        density: 300,
        format: 'png',
      };

      const convert = fromBuffer(fileBuffer, baseOptions);

      await convert
        .bulk(-1, { responseType: imageType as any })
        .then((outputs) => {
          outputs.forEach((output, key) => {
            if ([1, 2, outputs.length].includes(key + 1) && output[imageType].length) {
              images.push(output[imageType]);
            }
          });
        })
        .catch((err) => this.logger.error(JSON.stringify(err.response?.data || err.message || err)));

      this.logger.log('Finish convert pdf to img');
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
    }

    return images;
  }
}
