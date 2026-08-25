import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { IDiadocService, DiadocDocumentStatus } from './diadoc.service.interface';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPaymentService, IFormUpdate } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { FILE_SERVICE } from '../../file/file.constants';
import { IFileService } from '../../file/service/file.service.interface';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { IFormPaymentDocs, IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { SenderFormPaymentEvents, SenderPattern } from '../../../lib/enums/models/sender.enums';
import { IFormPaymentDocsUpdate } from '../types/diadoc-api.types';
import { UpdatePartial } from '../../../lib/services/base/base.service.interface';
import { Contract } from '../../contract/service/contract.schema';

/**
 * VF-2: Сервис для обработки изменений статуса документов в Diadoc
 *
 * Этот сервис отвечает за обработку событий изменения статуса документов,
 * полученных через webhook или периодическую проверку. При подписании
 * документа автоматически скачивает и сохраняет подписанную версию.
 *
 * ## Основные функции
 *
 * - Обработка подписания документов (скачивание, сохранение, обновление статуса)
 * - Обработка отклонения документов
 * - Обработка отмены документов
 * - Идемпотентность (повторная обработка того же события игнорируется)
 *
 * ## Поддерживаемые типы документов
 *
 * - Поручения на оплату (FormPayment.docs.paymentOrder)
 * - Отчёты агента (FormPayment.docs.report)
 * - Договоры (Contract)
 *
 * @example
 * ```typescript
 * // Использование из контроллера webhook
 * await webhookProcessor.processFormPaymentPaymentOrderStatusChange(
 *   formPayment,
 *   documentId,
 *   DiadocDocumentStatus.SIGNED,
 * );
 * ```
 *
 * @see {@link DiadocController} - контроллер webhook
 * @see {@link DiadocStatusCheckerService} - периодическая проверка
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocWebhookProcessorService {
  private readonly logger: Logger = new Logger(DiadocWebhookProcessorService.name);

  constructor(
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
    @Inject(FORM_PAYMENT_SERVICE) @Optional() private readonly formPaymentService?: IFormPaymentService,
    @Inject('IContractService') @Optional() private readonly contractService?: IContractService,
    @Inject(FILE_SERVICE) @Optional() private readonly fileService?: IFileService,
    @InjectNats() @Optional() private readonly natsClient?: NatsClientProxy,
  ) {}

  /**
   * Обрабатывает изменение статуса поручения на оплату в FormPayment
   * @param formPayment - объект FormPayment с полем docs типа IFormPaymentDocs
   */
  async processFormPaymentPaymentOrderStatusChange(
    formPayment: { _id: string; status: FormPaymentStatus; docs?: IFormPaymentDocs; [key: string]: any },
    documentId: string,
    status: DiadocDocumentStatus,
  ): Promise<void> {
    this.logger.log(
      `Processing status change for FormPayment payment order: formPaymentId=${formPayment._id}, documentId=${documentId}, status=${status}`,
    );

    if (status === DiadocDocumentStatus.SIGNED) {
      // Идемпотентность: проверяем, что документ еще не был обработан
      const currentSignedFiles = Array.isArray(formPayment.docs?.paymentOrderSigned)
        ? formPayment.docs.paymentOrderSigned
        : [];

      // Проверяем, что текущий documentId еще не обработан
      // Если документ уже подписан и сохранён, игнорируем повторный webhook
      if (currentSignedFiles.length > 0 && formPayment.status === FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION) {
        this.logger.warn(
          `Payment order status change already processed for formPaymentId=${formPayment._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // Скачиваем подписанный документ
      if (!this.fileService || !this.diadocService || !this.formPaymentService) {
        this.logger.error('FileService, DiadocService or FormPaymentService not available');
        return;
      }

      try {
        const signedDocumentBuffer = await this.diadocService.getSignedDocument(documentId);

        // Получаем account из formPayment
        const accountId = typeof formPayment.account === 'string' ? formPayment.account : formPayment.account?._id;
        if (!accountId) {
          this.logger.error(`Account not found for formPayment ${formPayment._id}`);
          return;
        }

        // Получаем оригинальный файл для имени и mimeType
        const originalFileRef = formPayment.docs?.paymentOrderDocx || formPayment.docs?.paymentOrder;
        const originalFileId = typeof originalFileRef === 'string' ? originalFileRef : (originalFileRef as { _id: string })?._id;
        let originalName = `payment-order-signed-${formPayment.uid || formPayment._id}.pdf`;
        let mimeType = 'application/pdf';

        if (originalFileId) {
          try {
            const originalFile = await this.fileService.findOne({ _id: originalFileId });
            if (originalFile) {
              originalName = originalFile.originalName?.replace(/\.[^.]+$/, '-signed.pdf') || originalName;
              mimeType = originalFile.mimeType || mimeType;
            }
          } catch (error) {
            this.logger.warn(`Failed to get original file info: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Сохраняем подписанный документ в FileService
        const signedFile = await this.fileService.baseUpload({
          account: accountId.toString(),
          private: true,
          originalName: originalName,
          mimeType: mimeType,
          size: signedDocumentBuffer.length,
          buffer: signedDocumentBuffer,
        });

        // Добавляем файл в массив paymentOrderSigned
        // VF-2 FIX: Преобразуем существующие файлы в массив string ID для типобезопасности
        const currentSignedFiles = formPayment.docs?.paymentOrderSigned;
        const currentSignedFileIds: string[] = Array.isArray(currentSignedFiles)
          ? currentSignedFiles.map(f => typeof f === 'string' ? f : f._id?.toString() || '').filter(Boolean)
          : [];

        // VF-2 FIX: Обновляем заявку (статус меняется на SIGNING_ORDER_WAITING_VERIFICATION согласно плану)
        const updatePaymentOrderData: IFormUpdate = {
          docs: {
            ...(formPayment.docs || {}),
            paymentOrderSigned: [...currentSignedFileIds, signedFile._id.toString()],
          },
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updatePaymentOrderData);

        // Записываем метрику подписанного документа
        if (this.diadocService) {
          this.diadocService.recordDocumentSigned();
        }

        this.logger.log(
          `Signed payment order document saved and formPayment updated: formPaymentId=${formPayment._id}, fileId=${signedFile._id}`,
        );

        // VF-2: Отправка уведомления клиенту о подписании документа
        await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_DOCUMENT_SIGNED);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to download and save signed payment order document: ${errorMessage}`);
        throw error;
      }
    } else if (status === DiadocDocumentStatus.REJECTED) {
      // Идемпотентность: проверяем, что статус еще не был обновлён
      if (formPayment.status === FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS) {
        this.logger.warn(
          `Payment order rejection already processed for formPaymentId=${formPayment._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // Записываем метрику отклонённого документа
      if (this.diadocService) {
        this.diadocService.recordDocumentRejected();
      }

      // VF-2 FIX: Обновляем статус при отклонении
      if (this.formPaymentService) {
        const updateRejectionData: IFormUpdate = {
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updateRejectionData);

        // VF-2: Отправка уведомления клиенту об отклонении документа
        await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_DOCUMENT_REJECTED);
      }
    } else if (status === DiadocDocumentStatus.CANCELLED) {
      // Обработка отмены подписания
      this.logger.log(`Payment order signing cancelled for formPaymentId=${formPayment._id}, documentId=${documentId}`);

      if (this.formPaymentService) {
        const updateCancellationData: IFormUpdate = {
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updateCancellationData);
        this.logger.log(`Payment order status updated after cancellation: formPaymentId=${formPayment._id}`);
      }
    }
  }

  /**
   * Обрабатывает изменение статуса отчёта в FormPayment
   * @param formPayment - объект FormPayment с полем docs типа IFormPaymentDocs
   */
  async processFormPaymentReportStatusChange(
    formPayment: { _id: string; status: FormPaymentStatus; docs?: IFormPaymentDocs; [key: string]: any },
    documentId: string,
    status: DiadocDocumentStatus,
  ): Promise<void> {
    this.logger.log(
      `Processing status change for FormPayment report: formPaymentId=${formPayment._id}, documentId=${documentId}, status=${status}`,
    );

    if (status === DiadocDocumentStatus.SIGNED) {
      // Идемпотентность: проверяем, что документ еще не был обработан
      if (formPayment.docs?.reportSigned) {
        this.logger.warn(
          `Report status change already processed for formPaymentId=${formPayment._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // Скачиваем подписанный документ
      if (!this.fileService || !this.diadocService || !this.formPaymentService) {
        this.logger.error('FileService, DiadocService or FormPaymentService not available');
        return;
      }

      try {
        const signedDocumentBuffer = await this.diadocService.getSignedDocument(documentId);

        // Получаем account из formPayment
        const accountId = typeof formPayment.account === 'string' ? formPayment.account : formPayment.account?._id;
        if (!accountId) {
          this.logger.error(`Account not found for formPayment ${formPayment._id}`);
          return;
        }

        // Получаем оригинальный файл для имени и mimeType
        const originalFileRef = formPayment.docs?.docxFile || formPayment.docs?.report;
        const originalFileId = typeof originalFileRef === 'string' ? originalFileRef : (originalFileRef as { _id: string })?._id;
        let originalName = `report-signed-${formPayment.uid || formPayment._id}.pdf`;
        let mimeType = 'application/pdf';

        if (originalFileId) {
          try {
            const originalFile = await this.fileService.findOne({ _id: originalFileId });
            if (originalFile) {
              originalName = originalFile.originalName?.replace(/\.[^.]+$/, '-signed.pdf') || originalName;
              mimeType = originalFile.mimeType || mimeType;
            }
          } catch (error) {
            this.logger.warn(`Failed to get original file info: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Сохраняем подписанный документ в FileService
        const signedFile = await this.fileService.baseUpload({
          account: accountId.toString(),
          private: true,
          originalName: originalName,
          mimeType: mimeType,
          size: signedDocumentBuffer.length,
          buffer: signedDocumentBuffer,
        });

        // VF-2: Определяем следующий статус на основе текущего статуса
        let nextStatus = formPayment.status;
        if (formPayment.status === FormPaymentStatus.REPORT_WAITING) {
          nextStatus = FormPaymentStatus.REPORT_WAITING_VERIFICATION;
        } else if (formPayment.status === FormPaymentStatus.REPORT_WAITING_DIADOC) {
          // VF-2: При подписании из промежуточного статуса REPORT_WAITING_DIADOC
          nextStatus = FormPaymentStatus.REPORT_WAITING_VERIFICATION;
        } else if (
          formPayment.status === FormPaymentStatus.PAYMENT_SENT ||
          formPayment.status === FormPaymentStatus.REPORT_ACCEPTED
        ) {
          // Для корпоративных заявок статус может остаться REPORT_ACCEPTED
          nextStatus = FormPaymentStatus.REPORT_ACCEPTED;
        }

        // VF-2 FIX: Обновляем заявку
        const updateReportData: IFormUpdate = {
          docs: {
            ...(formPayment.docs || {}),
            reportSigned: signedFile._id,
          },
          status: nextStatus,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updateReportData);

        // Записываем метрику подписанного документа
        if (this.diadocService) {
          this.diadocService.recordDocumentSigned();
        }

        this.logger.log(
          `Signed report document saved and formPayment updated: formPaymentId=${formPayment._id}, fileId=${signedFile._id}`,
        );

        // VF-2: Отправка уведомления клиенту о подписании документа
        await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_DOCUMENT_SIGNED);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to download and save signed report document: ${errorMessage}`);
        throw error;
      }
    } else if (status === DiadocDocumentStatus.REJECTED) {
      // VF-2: Обработка отклонения подписания отчёта
      this.logger.log(`Report signing rejected for formPaymentId=${formPayment._id}, documentId=${documentId}`);

      // Идемпотентность: проверяем, что статус еще не был обновлён
      if (formPayment.status === FormPaymentStatus.REPORT_WAITING_CORRECTIONS) {
        this.logger.warn(
          `Report rejection already processed for formPaymentId=${formPayment._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // Записываем метрику отклонённого документа
      if (this.diadocService) {
        this.diadocService.recordDocumentRejected();
      }

      // VF-2 FIX: Обновляем статус при отклонении
      if (this.formPaymentService) {
        const updateReportRejectionData: IFormUpdate = {
          status: FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updateReportRejectionData);

        // VF-2: Отправка уведомления клиенту об отклонении документа
        await this.sendNotificationToUser(formPayment, SenderFormPaymentEvents.DIADOC_DOCUMENT_REJECTED);
      }
    } else if (status === DiadocDocumentStatus.CANCELLED) {
      // Обработка отмены подписания отчёта
      this.logger.log(`Report signing cancelled for formPaymentId=${formPayment._id}, documentId=${documentId}`);

      // VF-2: При отмене переводим из REPORT_WAITING_DIADOC обратно в REPORT_WAITING
      if (formPayment.status === FormPaymentStatus.REPORT_WAITING_DIADOC && this.formPaymentService) {
        const updateReportCancellationData: IFormUpdate = {
          status: FormPaymentStatus.REPORT_WAITING,
          prevStatus: formPayment.status,
        };
        await this.formPaymentService.updateOne({ _id: formPayment._id }, updateReportCancellationData);
        this.logger.log(`Report status updated after cancellation: formPaymentId=${formPayment._id}`);
      }
    }
  }

  /**
   * Обрабатывает изменение статуса договора
   */
  async processContractStatusChange(
    contract: any,
    documentId: string,
    status: DiadocDocumentStatus,
  ): Promise<void> {
    this.logger.log(`Processing status change for Contract: contractId=${contract._id}, documentId=${documentId}, status=${status}`);

    if (status === DiadocDocumentStatus.SIGNED) {
      // Идемпотентность: проверяем, что договор уже не подписан
      if (contract.diadocSignedAt || contract.status === ContractStatus.ACCEPTED) {
        this.logger.warn(
          `Contract status change already processed for contractId=${contract._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // VF-2: Проверяем, что договор в промежуточном статусе WAITING_DIADOC
      if (contract.status !== ContractStatus.WAITING_DIADOC && contract.status !== ContractStatus.CREATED) {
        this.logger.warn(
          `Contract status is ${contract.status}, expected WAITING_DIADOC or CREATED. Processing anyway.`,
        );
      }

      // Скачиваем подписанный документ
      if (!this.fileService || !this.diadocService || !this.contractService) {
        this.logger.error('FileService, DiadocService or ContractService not available');
        return;
      }

      try {
        const signedDocumentBuffer = await this.diadocService.getSignedDocument(documentId);

        // Получаем account из contract
        const accountId = typeof contract.account === 'string' ? contract.account : contract.account?._id;
        if (!accountId) {
          this.logger.error(`Account not found for contract ${contract._id}`);
          return;
        }

        // Получаем оригинальный файл для имени и mimeType
        const originalFileId = contract.file;
        let originalName = `contract-signed-${contract._id}.pdf`;
        let mimeType = 'application/pdf';

        if (originalFileId) {
          try {
            const originalFile = await this.fileService.findOne({ _id: originalFileId });
            if (originalFile) {
              originalName = originalFile.originalName?.replace(/\.[^.]+$/, '-signed.pdf') || originalName;
              mimeType = originalFile.mimeType || mimeType;
            }
          } catch (error) {
            this.logger.warn(`Failed to get original file info: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Сохраняем подписанный документ в FileService
        const signedFile = await this.fileService.baseUpload({
          account: accountId.toString(),
          private: true,
          originalName: originalName,
          mimeType: mimeType,
          size: signedDocumentBuffer.length,
          buffer: signedDocumentBuffer,
        });

        // VF-2 FIX: Обновляем договор с типизированным интерфейсом
        const updateContractData: UpdatePartial<Contract> = {
          file: signedFile._id,
          status: ContractStatus.ACCEPTED,
          diadocSignedAt: new Date(),
          signatureType: 'diadoc',
        };
        await this.contractService.updateOne({ _id: contract._id }, updateContractData);

        // Записываем метрику подписанного документа
        if (this.diadocService) {
          this.diadocService.recordDocumentSigned();
        }

        this.logger.log(
          `Signed contract document saved and contract updated: contractId=${contract._id}, fileId=${signedFile._id}`,
        );

        // VF-2: Отправка уведомления клиенту о подписании договора
        await this.sendContractNotificationToUser(contract, SenderFormPaymentEvents.DIADOC_DOCUMENT_SIGNED);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to download and save signed contract document: ${errorMessage}`);
        throw error;
      }
    } else if (status === DiadocDocumentStatus.REJECTED) {
      // Идемпотентность: проверяем, что статус еще не был обновлён
      if (contract.status === ContractStatus.REJECTED) {
        this.logger.warn(
          `Contract rejection already processed for contractId=${contract._id}, documentId=${documentId}. Ignoring duplicate.`,
        );
        return;
      }

      // Записываем метрику отклонённого документа
      if (this.diadocService) {
        this.diadocService.recordDocumentRejected();
      }

      // VF-2 FIX: Обновляем статус при отклонении
      if (this.contractService) {
        const updateContractRejectionData: UpdatePartial<Contract> = {
          status: ContractStatus.REJECTED,
        };
        await this.contractService.updateOne({ _id: contract._id }, updateContractRejectionData);

        // VF-2: Отправка уведомления клиенту об отклонении договора
        await this.sendContractNotificationToUser(contract, SenderFormPaymentEvents.DIADOC_DOCUMENT_REJECTED);
      }
    } else if (status === DiadocDocumentStatus.CANCELLED) {
      // Обработка отмены подписания договора
      this.logger.log(`Contract signing cancelled for contractId=${contract._id}, documentId=${documentId}`);

      // VF-2: При отмене переводим из WAITING_DIADOC обратно в CREATED
      if (this.contractService) {
        const newStatus = contract.status === ContractStatus.WAITING_DIADOC
          ? ContractStatus.CREATED
          : ContractStatus.REJECTED;

        const updateContractCancellationData: UpdatePartial<Contract> = {
          status: newStatus,
          isDiadocSigning: false,
        };
        await this.contractService.updateOne({ _id: contract._id }, updateContractCancellationData);
        this.logger.log(`Contract status updated after cancellation: contractId=${contract._id}, newStatus=${newStatus}`);
      }
    }
  }

  /**
   * VF-2: Отправляет уведомление клиенту о событии FormPayment через NATS
   */
  private async sendNotificationToUser(formPayment: any, event: SenderFormPaymentEvents): Promise<void> {
    if (!this.natsClient) {
      this.logger.warn('NatsClient not available, skipping notification');
      return;
    }

    try {
      const accountId = typeof formPayment.account === 'string'
        ? formPayment.account
        : formPayment.account?._id?.toString();

      if (!accountId) {
        this.logger.warn(`Cannot send notification: account not found for formPayment ${formPayment._id}`);
        return;
      }

      await this.natsClient.send(SenderPattern.SEND_USER, {
        type: event,
        account: accountId,
        data: { ...formPayment },
        language: 'ru',
      });

      this.logger.log(`Notification sent to user: formPaymentId=${formPayment._id}, event=${event}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending notification for formPayment ${formPayment._id}: ${errorMessage}`);
    }
  }

  /**
   * VF-2: Отправляет уведомление клиенту о событии Contract через NATS
   */
  private async sendContractNotificationToUser(contract: any, event: SenderFormPaymentEvents): Promise<void> {
    if (!this.natsClient) {
      this.logger.warn('NatsClient not available, skipping notification');
      return;
    }

    try {
      const accountId = typeof contract.account === 'string'
        ? contract.account
        : contract.account?._id?.toString();

      if (!accountId) {
        this.logger.warn(`Cannot send notification: account not found for contract ${contract._id}`);
        return;
      }

      await this.natsClient.send(SenderPattern.SEND_USER, {
        type: event,
        account: accountId,
        data: { ...contract },
        language: 'ru',
      });

      this.logger.log(`Notification sent to user: contractId=${contract._id}, event=${event}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending notification for contract ${contract._id}: ${errorMessage}`);
    }
  }
}

