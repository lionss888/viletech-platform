import { Process, Processor } from '@nestjs/bull';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { Job } from 'bull';
import {
  IFormPaymentProcessor,
  IGenerateAgentReportJobData,
  ISendUpdateNotificationsJobData,
  IParseExcelJobData,
} from './form-payment-queue.processor.interface';
import { FormPaymentPattern, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { IGenerateDocsService } from '../service/additional/generate-docs.service.interface';
import { IFormPaymentService } from '../service/form-payment.service.interface';
import { FORM_PAYMENT_SERVICE } from '../form-payment.constants';
import { IExcelParserService } from 'lib/services/excel-parser/excel-parser.service.interface';
import { ITemplateService } from 'modules/template/service/template.service.interface';
import { IFileService } from 'modules/file/service/file.service.interface';
import { IS3Service } from 'lib/modules/s3/s3.service.interface';
import { ISocketAuthorizedService } from 'modules/socket/service/socket.service.interface';
import { FileParseStatus } from 'lib/enums/models/file.enums';
import { SocketMessageContext, SocketMessageAction, FormPaymentSocketEventType } from 'lib/enums/models/socket.enum';
import { IFile } from 'lib/interfaces/models/file.interface';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { ITemplate } from 'lib/interfaces/models/template.interface';
import { IFormPaymentParsedData } from 'lib/interfaces/excel-parser.interface';
import {
  ISocketMessage,
  IFormPaymentExcelParsedPayload,
  IFormPaymentExcelParseFailedPayload,
  IFormPaymentExcelParseCancelledPayload,
  FormPaymentSocketPayload,
} from 'lib/interfaces/models/socket.interface';

@Processor(JobQueueName.FORM_PAYMENT_QUEUE)
export class FormPaymentQueueProcessor implements IFormPaymentProcessor {
  private readonly logger = new Logger(FormPaymentQueueProcessor.name);
  private readonly RUBLES_TO_KOPECKS = 100;

  constructor(
    @Inject('IFormPaymentGenerateDocsService') private readonly generateDocsService: IGenerateDocsService,
    @Inject(FORM_PAYMENT_SERVICE) private readonly formPaymentService: IFormPaymentService,
    @Inject('IExcelParserService') private readonly excelParserService: IExcelParserService,
    @Inject('ITemplateService') private readonly templateService: ITemplateService,
    @Inject('IFileService') private readonly fileService: IFileService,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
    @Inject('ISocketAuthorizedService') private readonly socketService: ISocketAuthorizedService,
  ) {}

  @Process(FormPaymentPattern.GENERATE_AGENT_REPORT)
  async handleGenerateAgentReport(job: Job<IGenerateAgentReportJobData>) {
    try {
      const { findData, data } = job.data;
      await this.generateDocsService.generateAgentReport(findData, data);
      this.logger.log(`Successfully processed agent report for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process agent report for job ${job.id}:`, error);
      throw error;
    }
  }

  @Process(FormPaymentPattern.SEND_UPDATE_NOTIFICATIONS)
  async handleSendUpdateNotifications(job: Job<ISendUpdateNotificationsJobData>) {
    try {
      await this.formPaymentService.sendFormPaymentNotifications(job.data.formPayment, job.data.action);
    } catch (e) {
      this.logger.error('Failed to send formPayment update notifications', e);
      throw e;
    }
  }

  @Process(FormPaymentPattern.PARSE_EXCEL)
  async handleParseExcel(job: Job<IParseExcelJobData>) {
    const { formPaymentId, fileId, templateId, accountId } = job.data;

    try {
      // Проверка: пропустить retry если файл уже успешно обработан
      const existingFile = await this.fileService.findOne({ _id: fileId });
      if (existingFile?.parseStatus === FileParseStatus.SUCCESS) {
        this.logger.debug(`File ${fileId} already processed successfully, skipping retry`);
        return;
      }

      const { formPayment, file, template } = await this.validateParseRequest(job.data);
      const { parsedData, warnings } = await this.executeExcelParsing(formPayment, file, template, fileId);
      const success = await this.saveAndNotifySuccess(formPayment, fileId, templateId, accountId, parsedData, warnings);

      this.logger.log(
        `Excel parsed ${
          success ? 'successfully' : 'cancelled'
        }: form=${formPaymentId}, file=${fileId}, account=${accountId}`,
      );
    } catch (error) {
      await this.handleParseError(error, formPaymentId, fileId, accountId);
      throw error;
    }
  }

  private async validateParseRequest(data: IParseExcelJobData): Promise<{
    formPayment: IFormPayment;
    file: IFile;
    template: ITemplate;
  }> {
    const { formPaymentId, fileId, templateId } = data;

    const formPayment = await this.formPaymentService.findOne({ _id: formPaymentId });
    if (!formPayment) {
      throw new NotFoundException('FormPayment not found');
    }

    const ALLOWED_STATUSES = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS];
    if (!ALLOWED_STATUSES.includes(formPayment.status)) {
      throw new BadRequestException(
        `Cannot parse Excel in status ${formPayment.status}. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      );
    }

    const file = await this.fileService.findOne({ _id: fileId });
    if (!file) {
      throw new NotFoundException('File not found (may have been deleted)');
    }

    const template = await this.templateService.findOne(templateId);
    if (!template || !template.isActive) {
      throw new BadRequestException('Template not active');
    }

    return { formPayment, file, template };
  }

  private async executeExcelParsing(
    formPayment: IFormPayment,
    file: IFile,
    template: ITemplate,
    fileId: string,
  ): Promise<{ parsedData: IFormPaymentParsedData; warnings: string[] }> {
    const fileBuffer = await this.fileService.getFileBuffer({ _id: fileId });
    const parsedData = await this.excelParserService.parseExcel(fileBuffer, template.mapping, {
      formPaymentId: String(formPayment._id),
      fileId,
      accountId: String(formPayment.account),
    });

    // Обработка полей для формирования комментария
    this.processCommentFields(parsedData);

    const warnings: string[] = [];

    if (Object.keys(parsedData).length === 0) {
      warnings.push('No data was extracted from the Excel file');
    }

    if (formPayment.status === FormPaymentStatus.FORM_WAITING_CORRECTIONS) {
      if (parsedData.direction && parsedData.direction !== formPayment.direction) {
        this.logger.debug(
          `Removing direction from parsed data for form ${formPayment._id} (cannot change in corrections)`,
        );
        delete parsedData.direction;
        warnings.push('Direction cannot be changed during corrections');
      }
    }

    return { parsedData, warnings };
  }

  private async saveAndNotifySuccess(
    formPayment: IFormPayment,
    fileId: string,
    templateId: string,
    accountId: string,
    parsedData: IFormPaymentParsedData,
    warnings: string[],
  ): Promise<boolean> {
    const cancelled = await this.saveFileParseResult(formPayment, fileId, templateId, accountId, parsedData);

    if (cancelled) return false; // Файл удален, CANCELLED событие уже отправлено

    await this.sendSuccessEvent(formPayment, fileId, accountId, parsedData, warnings);
    return true; // Успешно обработан
  }

  private async saveFileParseResult(
    formPayment: IFormPayment,
    fileId: string,
    templateId: string,
    accountId: string,
    parsedData: IFormPaymentParsedData,
  ): Promise<boolean> {
    try {
      await this.fileService.updateOne(
        { _id: fileId },
        {
          parsedValue: parsedData,
          parseStatus: FileParseStatus.SUCCESS,
          parseError: null,
          parseTemplateId: templateId,
          lastParsedAt: new Date(),
        },
      );

      await this.formPaymentService.updateOne({ _id: formPayment._id }, { importFile: fileId });

      return false; // Не cancelled
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`File ${fileId} was deleted during parsing for form ${formPayment._id}`);

        const payload: IFormPaymentExcelParseCancelledPayload = {
          eventType: FormPaymentSocketEventType.EXCEL_PARSE_CANCELLED,
          formPaymentId: String(formPayment._id),
          fileId,
          reason: 'File was deleted during processing',
        };

        await this.socketService.sendOne(this.createFormPaymentSocketMessage(accountId, payload));
        return true; // Cancelled
      }
      throw error;
    }
  }

  private async sendSuccessEvent(
    formPayment: IFormPayment,
    fileId: string,
    accountId: string,
    parsedData: IFormPaymentParsedData,
    warnings: string[],
  ): Promise<void> {
    this.logger.debug(`Sending socket SUCCESS event: form=${formPayment._id}, file=${fileId}, account=${accountId}`);

    const payload: IFormPaymentExcelParsedPayload = {
      eventType: FormPaymentSocketEventType.EXCEL_PARSED,
      formPaymentId: String(formPayment._id),
      fileId,
      parsedData,
      parseStatus: FileParseStatus.SUCCESS,
      ...(warnings.length > 0 ? { warnings } : {}),
    };

    await this.socketService.sendOne(this.createFormPaymentSocketMessage(accountId, payload));

    this.logger.debug(`Socket SUCCESS event queued: form=${formPayment._id}, file=${fileId}`);
  }

  private async handleParseError(
    error: Error,
    formPaymentId: string,
    fileId: string,
    accountId: string,
  ): Promise<void> {
    this.logger.error(`Excel parse failed: form=${formPaymentId}, file=${fileId}: ${error.message}`, error.stack);

    const humanReadableError = this.getHumanReadableError(error);

    try {
      await this.fileService.updateOne(
        { _id: fileId },
        { parseStatus: FileParseStatus.FAILED, parseError: humanReadableError },
      );
    } catch (updateError) {
      this.logger.error(`Failed to save parse error for file ${fileId}: ${updateError.message}`);
    }

    const payload: IFormPaymentExcelParseFailedPayload = {
      eventType: FormPaymentSocketEventType.EXCEL_PARSE_FAILED,
      formPaymentId,
      fileId,
      error: humanReadableError,
      parseStatus: FileParseStatus.FAILED,
    };

    await this.socketService.sendOne(this.createFormPaymentSocketMessage(accountId, payload));
  }

  private getHumanReadableError(error: Error): string {
    if (error instanceof NotFoundException) {
      return 'File or form not found. It may have been deleted.';
    }
    if (error instanceof BadRequestException) {
      return error.message;
    }
    if (error.message.includes('XLSX')) {
      return 'Invalid Excel file format. Please check your file.';
    }
    return 'Failed to parse Excel file. Please try again or contact support.';
  }

  private createFormPaymentSocketMessage(
    accountId: string,
    payload: FormPaymentSocketPayload,
  ): ISocketMessage<FormPaymentSocketPayload> {
    return {
      account: accountId,
      data: {
        action: SocketMessageAction.UPDATE,
        context: SocketMessageContext.FORM_PAYMENT,
        payload,
      },
    };
  }

  private processCommentFields(parsedData: IFormPaymentParsedData): void {
    const commentParts: string[] = [];

    // Курс конвертации
    if (parsedData.currency?.rate != null) {
      commentParts.push(`Курс: ${parsedData.currency.rate}`);
    }

    // Процент вознаграждения агента
    if (parsedData.totals?.feePercent != null) {
      if (typeof parsedData.totals.feePercent !== 'number' || isNaN(parsedData.totals.feePercent)) {
        this.logger.warn('Invalid feePercent value, skipping fee percent comment');
        parsedData.totals.feePercent = undefined;
      } else if (parsedData.totals.feePercent < 0 || parsedData.totals.feePercent > 10000) {
        this.logger.warn(`Unusual feePercent value: ${parsedData.totals.feePercent} basis points (expected 0-10000)`);
      }

      if (parsedData.totals.feePercent != null) {
        const feePercent = (parsedData.totals.feePercent / 100).toFixed(2);
        commentParts.push(`Процент вознаграждения агента: ${feePercent}%`);
      }
    }

    // Сумма вознаграждения агента (конвертируем из копеек в рубли)
    if (parsedData.totals?.feeAmount != null) {
      const amountInRubles = parsedData.totals.feeAmount / this.RUBLES_TO_KOPECKS;
      commentParts.push(`Сумма вознаграждения агента: ${amountInRubles} руб`);
    }

    // Дополнительная информация из текстового поля
    if (parsedData.text) {
      commentParts.push(`Доп.информация: ${parsedData.text}`);
    }

    // Если есть хотя бы одна часть - формируем comment
    if (commentParts.length > 0) {
      parsedData.comment = commentParts.join('. ');

      // Удаляем исходные поля
      if (parsedData.currency) {
        delete parsedData.currency.rate;
        if (Object.keys(parsedData.currency).length === 0) {
          delete parsedData.currency;
        }
      }

      if (parsedData.totals) {
        delete parsedData.totals.feePercent;
        delete parsedData.totals.feeAmount;
        if (Object.keys(parsedData.totals).length === 0) {
          delete parsedData.totals;
        }
      }

      delete parsedData.text;
    }
  }
}
