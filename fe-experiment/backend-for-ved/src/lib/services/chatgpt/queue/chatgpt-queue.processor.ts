import { Process, Processor } from '@nestjs/bull';
import { JobQueueName } from '../../../enums/models/job-queue.enums';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHATGPT_SERVICE } from '../chatgpt.service.interface';
import { IChatGptService } from '../chatgpt.service.interface';
import { ChatGptPattern } from '../../../enums/models/chatgpt.enums';
import { ChatGptStatus } from '../../../enums/models/form-payment.enums';
import { Job } from 'bull';
import {
  IChatGptQueueProcessor,
  IChatGptAnalyzeCounterpartyJobData,
  IChatGptError,
} from './chatgpt-queue.processor.interface';
import { FORM_PAYMENT_SERVICE } from '../../../../modules/form-payment/form-payment.constants';
import { IFormPaymentService } from '../../../../modules/form-payment/service/form-payment.service.interface';
import { ISocketAuthorizedService } from '../../../../modules/socket/service/socket.service.interface';
import { IFileService } from '../../../../modules/file/service/file.service.interface';
import {
  SocketMessageAction,
  SocketMessageContext,
  FormPaymentSocketEventType,
} from '../../../enums/models/socket.enum';
import {
  ISocketMessageData,
  IFormPaymentComplianceReportCompletedPayload,
} from '../../../interfaces/models/socket.interface';
import { AccountRole } from '../../../enums/models/account.enums';
import { IFormPayment } from '../../../interfaces/models/form-payment.interface';

@Processor(JobQueueName.CHATGPT_QUEUE)
export class ChatGptQueueProcessor implements IChatGptQueueProcessor {
  private readonly logger = new Logger(ChatGptQueueProcessor.name);

  constructor(
    @Inject(CHATGPT_SERVICE) private readonly chatGptService: IChatGptService,
    @Inject(FORM_PAYMENT_SERVICE) private readonly formPaymentService: IFormPaymentService,
    @Inject('ISocketAuthorizedService') private readonly socketService: ISocketAuthorizedService,
    @Inject('IFileService') private readonly fileService: IFileService,
    private readonly configService: ConfigService,
  ) {}

  @Process(ChatGptPattern.ANALYZE_COUNTERPARTY)
  async handleAnalyzeCounterparty(job: Job<IChatGptAnalyzeCounterpartyJobData>): Promise<void> {
    const { formPaymentId, promptTemplate, counterpartyData, requestCount } = job.data;
    const now = new Date();

    this.logger.log(`Starting ChatGPT analysis for form payment ${formPaymentId} (job ${job.id})`);

    // Устанавливаем статус PENDING в начале обработки
    try {
      await this.formPaymentService.updateOne(
        { _id: formPaymentId },
        {
          complianceReport: {
            status: ChatGptStatus.PENDING,
            createdDate: now,
            updatedDate: now,
          },
        },
      );
    } catch (dbError: unknown) {
      this.logger.warn(
        `Failed to set PENDING status for form payment ${formPaymentId}: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

    // Получаем formPayment для получения файла инвойса
    const formPayment = await this.formPaymentService.findOne({ _id: formPaymentId });

    // Загружаем файл инвойса в OpenAI, если он есть
    const invoiceFileId = await this.loadInvoiceFileToOpenAI(formPayment);

    try {
      // Отправляем запрос в ChatGPT с получением информации об ошибке
      const maxTokens = this.configService.get<number>('openai.maxTokens') || 8000;
      const result = await this.chatGptService.promptWithError(
        promptTemplate,
        counterpartyData,
        {
          maxTokens,
          temperature: 0.3,
        },
        invoiceFileId,
      );

      // Сохраняем результат или ошибку в базу
      const updateData: {
        complianceReport: {
          text?: string;
          status?: string;
          error?: IChatGptError;
          updatedDate?: Date;
        };
      } = {
        complianceReport: {
          updatedDate: new Date(),
        },
      };

      if (result.text) {
        updateData.complianceReport.text = result.text;
        updateData.complianceReport.status = ChatGptStatus.COMPLETED;
        this.logger.log(`ChatGPT analysis completed successfully for form payment ${formPaymentId} (job ${job.id})`);
      } else if (result.error) {
        // Сохраняем информацию об ошибке
        updateData.complianceReport.status = ChatGptStatus.REJECT;
        updateData.complianceReport.error = {
          message: result.error.message,
          statusCode: result.error.statusCode,
          timestamp: new Date(),
          attempts: result.error.attempts,
        };
        this.logger.error(
          `ChatGPT analysis failed for form payment ${formPaymentId} (job ${job.id}): ${
            result.error.message
          } (Status: ${result.error.statusCode || 'N/A'}, Attempts: ${result.error.attempts})`,
        );
      } else {
        // Если нет ни ответа, ни ошибки (не должно происходить, но на всякий случай)
        updateData.complianceReport.status = ChatGptStatus.REJECT;
        updateData.complianceReport.error = {
          message: 'ChatGPT не вернул ответ и не вернул информацию об ошибке',
          timestamp: new Date(),
          attempts: 0,
        };
        this.logger.error(
          `ChatGPT returned no response and no error for form payment ${formPaymentId} (job ${job.id})`,
        );
      }

      await this.formPaymentService.updateOne({ _id: formPaymentId }, updateData);

      // Отправляем сокет-уведомление с данными complianceReport при успешном ответе или при ошибке (reject)
      if (result.text) {
        await this.sendComplianceReportNotification(formPaymentId, updateData.complianceReport, now, requestCount);
      } else if (updateData.complianceReport.status === ChatGptStatus.REJECT) {
        // Отправляем уведомление при статусе reject (когда закончились попытки ретрая и данные записаны в БД)
        await this.sendComplianceReportNotification(formPaymentId, updateData.complianceReport, now, requestCount);
      }

      this.logger.log(`ChatGPT analysis job completed for form payment ${formPaymentId} (job ${job.id})`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error processing ChatGPT analysis job for form payment ${formPaymentId} (job ${job.id}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Сохраняем ошибку в БД
      const rejectUpdateData = {
        complianceReport: {
          status: ChatGptStatus.REJECT,
          error: {
            message: errorMessage,
            timestamp: new Date(),
            attempts: job.attemptsMade,
          },
          updatedDate: new Date(),
        },
      };

      try {
        await this.formPaymentService.updateOne({ _id: formPaymentId }, rejectUpdateData);

        // Отправляем сокет-уведомление после записи ошибки в БД (когда закончились попытки ретрая)
        await this.sendComplianceReportNotification(
          formPaymentId,
          rejectUpdateData.complianceReport,
          now,
          requestCount,
        );
      } catch (dbError: unknown) {
        this.logger.error(
          `Failed to save error to database for form payment ${formPaymentId}: ${
            dbError instanceof Error ? dbError.message : String(dbError)
          }`,
        );
      }

      throw error;
    } finally {
      // Удаляем файл из OpenAI после обработки (в любом случае), чтобы избежать накопления файлов
      if (invoiceFileId) {
        await this.chatGptService.deleteFile(invoiceFileId);
      }
    }
  }

  /**
   * Загружает файл инвойса в OpenAI, если он есть
   * @returns file_id загруженного файла или undefined
   */
  private async loadInvoiceFileToOpenAI(formPayment: IFormPayment | null): Promise<string | undefined> {
    // Если есть файл инвойса, загружаем его в OpenAI
    if (!formPayment?.invoices?.[0]?.file) {
      return undefined;
    }

    const invoiceFileIdString =
      typeof formPayment.invoices[0].file === 'string'
        ? formPayment.invoices[0].file
        : formPayment.invoices[0].file._id;

    try {
      // Получаем информацию о файле
      const fileInfo = await this.fileService.findOne({ _id: invoiceFileIdString });

      if (!fileInfo._id) {
        this.logger.warn(`Invoice file not found: ${fileInfo._id}. Continuing without file attachment.`);
        return undefined;
      }

      // Проверяем, что файл PDF
      if (fileInfo.mimeType !== 'application/pdf') {
        this.logger.warn(
          `Invoice file is not PDF (${fileInfo.mimeType}). Only PDF files are supported. Continuing without file attachment.`,
        );
        return undefined;
      }

      // Проверяем размер файла
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (fileInfo.size > MAX_FILE_SIZE) {
        this.logger.warn(
          `Invoice file is too large (${fileInfo.size} bytes). Max size: ${MAX_FILE_SIZE} bytes. Continuing without file attachment.`,
        );
        return undefined;
      }

      // Получаем файл из S3
      const fileBuffer = await this.fileService.getFileBuffer({ _id: fileInfo._id });

      // Загружаем файл в OpenAI
      const fileName = fileInfo.originalName || 'invoice.pdf';
      const file = await this.chatGptService.uploadFile(fileBuffer, fileName, fileInfo.mimeType);
      this.logger.log(`Invoice file uploaded to OpenAI: ${file.id}`);
      return file.id;
    } catch (fileError: unknown) {
      this.logger.warn(
        `Failed to upload invoice file to OpenAI: ${
          fileError instanceof Error ? fileError.message : String(fileError)
        }. Continuing without file attachment.`,
      );
      return undefined;
    }
  }

  private async sendComplianceReportNotification(
    formPaymentId: string,
    complianceReport: {
      text?: string;
      status?: string;
      error?: IChatGptError;
      updatedDate?: Date;
    },
    createdDate: Date,
    requestCount?: number,
  ): Promise<void> {
    try {
      const payload: IFormPaymentComplianceReportCompletedPayload = {
        eventType: FormPaymentSocketEventType.COMPLIANCE_REPORT_COMPLETED,
        formPaymentId,
        complianceReport: {
          text: complianceReport.text,
          status: complianceReport.status,
          error: complianceReport.error,
          createdDate,
          updatedDate: complianceReport.updatedDate || new Date(),
          requestCount,
        },
      };

      const socketMessageData: ISocketMessageData<IFormPaymentComplianceReportCompletedPayload> = {
        action: SocketMessageAction.UPDATE,
        context: SocketMessageContext.FORM_PAYMENT,
        payload,
        room: `role:${AccountRole.COMPLIANCE_OFFICER}`,
      };

      // Отправляем уведомление всем compliance officers через комнату роли
      await this.socketService.broadcast(socketMessageData);
      this.logger.log(
        `Sent compliance report notification (status: ${complianceReport.status}) to compliance officers room for form payment ${formPaymentId}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send compliance report notification for form payment ${formPaymentId}: ${errorMessage}`,
        errorStack,
      );
      // Не пробрасываем ошибку, чтобы не прервать основной процесс
    }
  }
}
